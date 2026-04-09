import { memo, useMemo, useState, useCallback, useEffect, Fragment } from 'react'
import {
  SlidersHorizontal, RefreshCw, Filter, ChevronRight, ChevronDown, ChevronUp,
  TrendingDown, Grid3X3, Box, LayoutTemplate,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { useEstoqueStore } from '@/store/estoque.store'
import {
  useEstoqueKpi,
  useEstoqueChapa,
  useEstoqueBloco,
  useEstoqueFaturamentoMatriz,
  useEstoqueFiltrosDisponiveis,
  useEstoqueTableChildren,
  useEstoqueMatrizChildren,
} from '@/hooks/useEstoqueData'
import type {
  EstoqueTableResult,
  EstoqueMatrizResult,
  EstoqueDrillState,
  EstoqueDrillNode,
  EstoqueFiltros,
  MatrizSort,
} from '@/types'

// ─── Helpers de formatação ────────────────────────────────────
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmtNum = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtInt = (v: number) =>
  Math.round(v).toLocaleString('pt-BR')

const sanitize = (s: string) =>
  s.replace(/\?/g, '').trim()

// ─── Hierarquia de campos por tabela ─────────────────────────
const CHAPA_HEADERS = [
  'Material', 'Bloco', 'Grupo', 'Espessura', 'Industrialização', 'Chapa', 'Lote', 'Unidade',
]
// drill_chapa → drill_cod_estq: agora usa COD_ESTQ como chave interna
const CHAPA_FIELDS = [
  'drill_cod_ma', 'drill_bloco', 'drill_grp', 'drill_esp',
  'drill_ind', 'drill_cod_estq', 'drill_lote',
  // nível 7 (Unidade) não tem campo de drill (folha)
]
const BLOCO_HEADERS = ['Material', 'Bloco', 'Unidade']
const BLOCO_FIELDS  = ['drill_cod_ma', 'drill_bloco']
  // nível 2 (Unidade) folha — sem campo de drill

const FAT_HEADERS = ['Material', 'Unidade', 'Cliente', 'Pedido']
const FAT_FIELDS  = ['drill_cod_ma', 'drill_unidade', 'drill_cod_cliente']
  // nível 3 (Pedido) folha — sem campo de drill

// ─── Mapeamento campo drill → campo filtros store ─────────────
// drill_cod_cliente: caso especial — extrai material do path
const FIELD_TO_FILTRO: Partial<Record<string, keyof EstoqueFiltros>> = {
  'drill_cod_ma':   'materiais',
  'drill_bloco':    'blocos',
  'drill_grp':      'grupos',
  'drill_esp':      'espessuras',
  'drill_ind':      'industrializacao',
  'drill_cod_estq': 'chapas',
  'drill_lote':     'lotes',
  'drill_unidade':  'unidades',
}
const STRING_FILTROS = new Set<keyof EstoqueFiltros>(['industrializacao', 'lotes', 'unidades'])

// ─── Helpers de drill inline ──────────────────────────────────
function buildRowKey(path: EstoqueDrillNode[], level: number, value: string | number): string {
  const p = path.map(n => `${n.nivel}:${n.value}`).join('/')
  return p ? `${p}/${level}:${value}` : `${level}:${value}`
}

function buildChildDrill(
  path: EstoqueDrillNode[],
  level: number,
  field: string,
  value: string | number,
  label: string,
): EstoqueDrillState {
  const node: EstoqueDrillNode = { nivel: level, label, field, value }
  return { nivel: level + 1, path: [...path, node] }
}

// Verifica se uma linha está ativa no store de filtros
function isRowActive(
  level: number,
  value: string | number,
  field: string | undefined,
  path: EstoqueDrillNode[],
  filtros: EstoqueFiltros,
  isFat = false,
): boolean {
  // FAT: Cliente → verifica se o material ancestral está ativo
  if (isFat && (field === 'drill_cod_cliente' || (!field && level >= 3))) {
    const matNode = path.find(n => n.field === 'drill_cod_ma')
    if (!matNode) return false
    return filtros.materiais.includes(Number(matNode.value))
  }
  // Nível folha sem campo definido → unidades (para CHAPA/BLOCO)
  const key: keyof EstoqueFiltros | undefined = field
    ? FIELD_TO_FILTRO[field]
    : (isFat ? undefined : 'unidades')
  if (!key) return false
  const arr = filtros[key] as (string | number)[]
  const v = STRING_FILTROS.has(key) ? String(value) : Number(value)
  return arr.includes(v as never)
}

// Aplica toggle de filtro no store
function applyClickFilter(
  level: number,
  value: string | number,
  field: string | undefined,
  path: EstoqueDrillNode[],
  filtros: EstoqueFiltros,
  setFiltros: (p: Partial<EstoqueFiltros>) => void,
  isFat = false,
): void {
  // FAT Cliente/Pedido → extrai material do path e togla em filtros.materiais
  if (isFat && (field === 'drill_cod_cliente' || (!field && level >= 3))) {
    const matNode = path.find(n => n.field === 'drill_cod_ma')
    if (!matNode) return
    const matId = Number(matNode.value)
    const arr = filtros.materiais
    setFiltros({ materiais: arr.includes(matId) ? arr.filter(v => v !== matId) : [...arr, matId] })
    return
  }
  const key: keyof EstoqueFiltros | undefined = field
    ? FIELD_TO_FILTRO[field]
    : (isFat ? undefined : 'unidades')
  if (!key) return
  const isStr = STRING_FILTROS.has(key)
  const v = isStr ? String(value) : Number(value)
  const arr = filtros[key] as (string | number)[]
  setFiltros({ [key]: arr.includes(v as never) ? arr.filter(x => x !== v) : [...arr, v] } as Partial<EstoqueFiltros>)
}

// ─── KPI card ─────────────────────────────────────────────────
interface KpiBlockProps {
  title:     string
  value:     string
  subtitle?: string
  icon:      React.ElementType
  accent:    string
  loading?:  boolean
}

const KpiBlock = memo(function KpiBlock({
  title, value, subtitle, icon: Icon, accent, loading,
}: KpiBlockProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-surface border border-surface-border p-4 card-glow flex-1 flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-3 w-14" />
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-surface border border-surface-border p-4 card-glow flex-1 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest truncate">
          {title}
        </p>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', `${accent}/15`)}>
          <Icon size={14} className={accent} strokeWidth={1.5} />
        </div>
      </div>
      <p className={cn('font-display font-bold tabular-nums leading-tight truncate', 'text-3xl lg:text-4xl', accent)}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[12px] text-text-muted">{subtitle}</p>
      )}
    </div>
  )
})

// ─── InlineRows — filhos recursivos de HierarchyTable ─────────
interface InlineRowsProps {
  endpoint:       'chapa' | 'bloco'
  parentDrill:    EstoqueDrillState
  depth:          number
  fields:         string[]
  maxNivel:       number
  expandedKeys:   Set<string>
  onToggleExpand: (key: string) => void
  filtros:        EstoqueFiltros
  onFilter:       (p: Partial<EstoqueFiltros>) => void
}

function InlineRows({
  endpoint, parentDrill, depth, fields, maxNivel,
  expandedKeys, onToggleExpand, filtros, onFilter,
}: InlineRowsProps) {
  const { data, isLoading } = useEstoqueTableChildren(endpoint, parentDrill)
  const currentLevel = parentDrill.nivel
  const rows         = data?.rows ?? []
  const currentField = fields[currentLevel]
  const canExpand    = currentLevel < maxNivel && !!fields[currentLevel]

  if (isLoading) {
    return (
      <div className="px-3 py-1.5" style={{ paddingLeft: 12 + depth * 16 }}>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!rows.length) return null

  return (
    <>
      {rows.map(row => {
        const key        = buildRowKey(parentDrill.path, currentLevel, row.value)
        const isExpanded = expandedKeys.has(key)
        const isSelected = isRowActive(currentLevel, row.value, currentField, parentDrill.path, filtros)

        return (
          <Fragment key={key}>
            <div
              className={cn(
                'grid grid-cols-[1fr_88px_52px] border-b border-surface-border/20',
                'hover:bg-surface-light/40 transition-colors',
                isSelected && 'bg-brand/10 border-l-2 border-l-brand',
              )}
            >
              {/* Label com ícone e indentação */}
              <div
                className="flex items-center gap-1 min-w-0 py-1"
                style={{ paddingLeft: 8 + depth * 16 }}
              >
                <button
                  type="button"
                  className="shrink-0 w-4 h-4 flex items-center justify-center"
                  onClick={() => { if (canExpand) onToggleExpand(key) }}
                  tabIndex={canExpand ? 0 : -1}
                  aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                >
                  {canExpand ? (
                    isExpanded
                      ? <ChevronDown size={10} className="text-brand/70" />
                      : <ChevronRight size={10} className="text-text-muted hover:text-brand transition-colors" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 block" />
                  )}
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex-1 text-[11px] text-left truncate pr-1',
                    isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                  )}
                  onClick={() => applyClickFilter(currentLevel, row.value, currentField, parentDrill.path, filtros, onFilter)}
                  title={row.label}
                >
                  {sanitize(row.label)}
                </button>
              </div>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {fmtNum(row.metragem)}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-1">
                {fmtInt(row.pc)}
              </span>
            </div>

            {isExpanded && canExpand && (
              <InlineRows
                endpoint={endpoint}
                parentDrill={buildChildDrill(parentDrill.path, currentLevel, currentField, row.value, row.label)}
                depth={depth + 1}
                fields={fields}
                maxNivel={maxNivel}
                expandedKeys={expandedKeys}
                onToggleExpand={onToggleExpand}
                filtros={filtros}
                onFilter={onFilter}
              />
            )}
          </Fragment>
        )
      })}
    </>
  )
}

// ─── HierarchyTable ───────────────────────────────────────────
interface HierarchyTableProps {
  title:    string
  headers:  string[]
  fields:   string[]
  endpoint: 'chapa' | 'bloco'
  data?:    EstoqueTableResult
  loading?: boolean
  filtros:  EstoqueFiltros
  onFilter: (p: Partial<EstoqueFiltros>) => void
}

const HierarchyTable = memo(function HierarchyTable({
  title, headers, fields, endpoint, data, loading, filtros, onFilter,
}: HierarchyTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleSort = useCallback((col: string) => {
    setSortCol(prev => {
      if (prev === col) {
        setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')
        return col
      }
      setSortDir('asc')
      return col
    })
  }, [])

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <span className="inline-block w-2.5" />
    if (sortDir === 'asc')  return <ChevronUp   size={9} className="inline-block text-brand" />
    if (sortDir === 'desc') return <ChevronDown  size={9} className="inline-block text-brand" />
    return <span className="inline-block w-2.5" />
  }

  const rawRows    = data?.rows     ?? []
  const totais     = data?.totais
  const maxNivel   = data?.maxNivel ?? fields.length
  const level0Field = fields[0]
  const canExpand0 = maxNivel > 0 && !!level0Field

  const rows = useMemo(() => {
    if (!sortCol || !sortDir) return rawRows
    return [...rawRows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortCol === 'label')    return dir * a.label.localeCompare(b.label)
      if (sortCol === 'metragem') return dir * (a.metragem - b.metragem)
      if (sortCol === 'pc')       return dir * (a.pc - b.pc)
      return 0
    })
  }, [rawRows, sortCol, sortDir])

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      {/* Título */}
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          {title}
        </p>
      </div>

      {/* Cabeçalho fixo */}
      <div className="grid grid-cols-[1fr_88px_52px] px-3 py-1.5 bg-surface-light border-b border-surface-border shrink-0">
        <button type="button" onClick={() => handleSort('label')}
          className="flex items-center gap-0.5 text-[10px] text-text-muted uppercase tracking-wider pl-5 hover:text-text-secondary">
          {headers[0]} <SortIcon col="label" />
        </button>
        <button type="button" onClick={() => handleSort('metragem')}
          className="flex items-center justify-end gap-0.5 text-[10px] text-text-muted uppercase tracking-wider pr-2 hover:text-text-secondary">
          <SortIcon col="metragem" /> Metragem
        </button>
        <button type="button" onClick={() => handleSort('pc')}
          className="flex items-center justify-end gap-0.5 text-[10px] text-text-muted uppercase tracking-wider pr-1 hover:text-text-secondary">
          <SortIcon col="pc" /> PC
        </button>
      </div>

      {/* Corpo */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 340 }}>
        {loading ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[11px] text-text-muted">Sem dados</p>
          </div>
        ) : (
          rows.map((row, idx) => {
            const key        = buildRowKey([], 0, row.value)
            const isExpanded = expandedKeys.has(key)
            const isSelected = isRowActive(0, row.value, level0Field, [], filtros)

            return (
              <Fragment key={key}>
                <div
                  className={cn(
                    'grid grid-cols-[1fr_88px_52px] border-b border-surface-border/30',
                    'hover:bg-surface-light/40 transition-colors',
                    idx % 2 === 1 && !isSelected && 'bg-surface-light/15',
                    isSelected && 'bg-brand/10 border-l-2 border-l-brand',
                  )}
                >
                  <div className="flex items-center gap-1 min-w-0 py-1 pl-2">
                    <button
                      type="button"
                      className="shrink-0 w-4 h-4 flex items-center justify-center"
                      onClick={() => { if (canExpand0) toggleExpand(key) }}
                      tabIndex={canExpand0 ? 0 : -1}
                      aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                    >
                      {canExpand0 ? (
                        isExpanded
                          ? <ChevronDown size={10} className="text-brand/70" />
                          : <ChevronRight size={10} className="text-text-muted hover:text-brand transition-colors" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 block" />
                      )}
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'flex-1 text-[11px] text-left truncate pr-1',
                        isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                      )}
                      onClick={() => applyClickFilter(0, row.value, level0Field, [], filtros, onFilter)}
                      title={row.label}
                    >
                      {sanitize(row.label)}
                    </button>
                  </div>
                  <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                    {fmtNum(row.metragem)}
                  </span>
                  <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-1">
                    {fmtInt(row.pc)}
                  </span>
                </div>

                {isExpanded && canExpand0 && level0Field && (
                  <InlineRows
                    endpoint={endpoint}
                    parentDrill={buildChildDrill([], 0, level0Field, row.value, row.label)}
                    depth={1}
                    fields={fields}
                    maxNivel={maxNivel}
                    expandedKeys={expandedKeys}
                    onToggleExpand={toggleExpand}
                    filtros={filtros}
                    onFilter={onFilter}
                  />
                )}
              </Fragment>
            )
          })
        )}
      </div>

      {/* Total */}
      {!loading && totais && (
        <div className="grid grid-cols-[1fr_88px_52px] px-3 py-1.5 bg-surface-light border-t border-surface-border shrink-0">
          <span className="text-[11px] font-semibold text-text-secondary pl-5">Total</span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtNum(totais.metragem)}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-1">
            {fmtInt(totais.pc)}
          </span>
        </div>
      )}
    </Card>
  )
})

// ─── InlineMatrizRows — filhos recursivos de HierarchyMatriz ──
interface InlineMatrizRowsProps {
  parentDrill:    EstoqueDrillState
  periodos:       string[]
  depth:          number
  maxNivel:       number
  expandedKeys:   Set<string>
  onToggleExpand: (key: string) => void
  filtros:        EstoqueFiltros
  onFilter:       (p: Partial<EstoqueFiltros>) => void
  COL_DIM:        number
}

function InlineMatrizRows({
  parentDrill, periodos, depth, maxNivel,
  expandedKeys, onToggleExpand, filtros, onFilter, COL_DIM,
}: InlineMatrizRowsProps) {
  const { data, isLoading } = useEstoqueMatrizChildren(parentDrill)
  const currentLevel = parentDrill.nivel
  const rows         = data?.rows ?? []
  const currentField = FAT_FIELDS[currentLevel]
  const canExpand    = currentLevel < maxNivel && !!currentField

  const { itemMap, pivot } = useMemo(() => {
    if (!rows.length) return { itemMap: new Map<string, string>(), pivot: {} as Record<string, Record<string, { quantidade: number; total: number }>> }
    const im = new Map<string, string>()
    rows.forEach(r => { if (!im.has(String(r.value))) im.set(String(r.value), r.label) })
    const pv: Record<string, Record<string, { quantidade: number; total: number }>> = {}
    rows.forEach(r => {
      const pk = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      const ik = String(r.value)
      if (!pv[ik]) pv[ik] = {}
      pv[ik][pk] = { quantidade: r.quantidade, total: r.total }
    })
    return { itemMap: im, pivot: pv }
  }, [rows])

  if (isLoading) {
    return (
      <tr>
        <td colSpan={2 + periodos.length * 2}>
          <div className="px-3 py-1.5" style={{ paddingLeft: 12 + depth * 14 }}>
            <Skeleton className="h-4 w-full" />
          </div>
        </td>
      </tr>
    )
  }

  if (!itemMap.size) return null

  return (
    <>
      {Array.from(itemMap.entries()).map(([value, label]) => {
        const key        = buildRowKey(parentDrill.path, currentLevel, value)
        const isExpanded = expandedKeys.has(key)
        const isSelected = isRowActive(currentLevel, value, currentField, parentDrill.path, filtros, true)

        return (
          <Fragment key={key}>
            <tr className={cn(
              'border-b border-surface-border/30 hover:bg-surface-light/40 transition-colors',
              isSelected && 'bg-brand/10',
            )}>
              {/* Expand + Label */}
              <td
                colSpan={2}
                className={cn('sticky z-[5] bg-surface border-r border-surface-border', isSelected && 'border-l-2 border-l-brand')}
                style={{ maxWidth: COL_DIM + 24, paddingLeft: 4 + depth * 14, left: 0 }}
              >
                <div className="flex items-center gap-1 min-w-0 py-1">
                  <button
                    type="button"
                    className="shrink-0 w-4 h-4 flex items-center justify-center"
                    onClick={() => { if (canExpand) onToggleExpand(key) }}
                    tabIndex={canExpand ? 0 : -1}
                  >
                    {canExpand ? (
                      isExpanded
                        ? <ChevronDown size={10} className="text-brand/70" />
                        : <ChevronRight size={10} className="text-text-muted hover:text-brand transition-colors" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 block" />
                    )}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex-1 text-[11px] text-left truncate pr-2',
                      isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                    )}
                    onClick={() => applyClickFilter(currentLevel, value, currentField, parentDrill.path, filtros, onFilter, true)}
                    title={label}
                  >
                    {sanitize(label)}
                  </button>
                </div>
              </td>
              {/* Células de período */}
              {periodos.map(p => {
                const cell = pivot[value]?.[p]
                return (
                  <Fragment key={p}>
                    <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary">
                      {cell ? fmtNum(cell.quantidade) : ''}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary border-r border-surface-border/30">
                      {cell ? fmtNum(cell.total) : ''}
                    </td>
                  </Fragment>
                )
              })}
            </tr>

            {isExpanded && canExpand && currentField && (
              <InlineMatrizRows
                parentDrill={buildChildDrill(parentDrill.path, currentLevel, currentField, value, label)}
                periodos={periodos}
                depth={depth + 1}
                maxNivel={maxNivel}
                expandedKeys={expandedKeys}
                onToggleExpand={onToggleExpand}
                filtros={filtros}
                onFilter={onFilter}
                COL_DIM={COL_DIM}
              />
            )}
          </Fragment>
        )
      })}
    </>
  )
}

// ─── HierarchyMatriz ─────────────────────────────────────────
interface HierarchyMatrizProps {
  data?:         EstoqueMatrizResult
  loading?:      boolean
  filtros:       EstoqueFiltros
  onFilter:      (p: Partial<EstoqueFiltros>) => void
  onSortChange?: (sort: MatrizSort) => void
}

const HierarchyMatriz = memo(function HierarchyMatriz({
  data, loading, filtros, onFilter, onSortChange,
}: HierarchyMatrizProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  useEffect(() => {
    onSortChange?.({ col: sortCol, dir: sortDir })
  }, [sortCol, sortDir, onSortChange])

  const handleSort = useCallback((col: string) => {
    setSortCol(prev => {
      if (prev !== col) { setSortDir('asc'); return col }
      setSortDir(d => { if (d === 'asc') return 'desc'; setSortCol(null); return null })
      return prev
    })
  }, [])

  const SortIcon = ({ col }: { col: string }) => {
    const active = sortCol === col
    return (
      <span className="inline-flex flex-col ml-1 gap-px align-middle">
        <ChevronUp   size={8} className={active && sortDir === 'asc'  ? 'text-brand' : 'opacity-20'} />
        <ChevronDown size={8} className={active && sortDir === 'desc' ? 'text-brand' : 'opacity-20'} />
      </span>
    )
  }

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const rows     = data?.rows     ?? []
  const maxNivel = data?.maxNivel ?? 3

  const { periodos, items, pivot, totaisPeriodo } = useMemo(() => {
    if (!rows.length) return { periodos: [] as string[], items: [] as { value: string; label: string }[], pivot: {} as Record<string, Record<string, { quantidade: number; total: number }>>, totaisPeriodo: {} as Record<string, { quantidade: number; total: number }> }

    const periodSet = new Set<string>()
    rows.forEach(r => periodSet.add(`${r.ano}-${String(r.mes).padStart(2, '0')}`))
    const periodos = Array.from(periodSet).sort()

    const itemMap = new Map<string, string>()
    rows.forEach(r => { if (!itemMap.has(String(r.value))) itemMap.set(String(r.value), r.label) })
    const items = Array.from(itemMap.entries()).map(([value, label]) => ({ value, label }))

    const pivot: Record<string, Record<string, { quantidade: number; total: number }>> = {}
    const totaisPeriodo: Record<string, { quantidade: number; total: number }> = {}
    rows.forEach(r => {
      const pk = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      const ik = String(r.value)
      if (!pivot[ik]) pivot[ik] = {}
      pivot[ik][pk] = { quantidade: r.quantidade, total: r.total }
      if (!totaisPeriodo[pk]) totaisPeriodo[pk] = { quantidade: 0, total: 0 }
      totaisPeriodo[pk].quantidade += r.quantidade
      totaisPeriodo[pk].total      += r.total
    })

    return { periodos, items, pivot, totaisPeriodo }
  }, [rows])

  function periodoLabel(key: string) {
    const [ano, mes] = key.split('-')
    return `${MESES_ABREV[Number(mes) - 1] ?? mes} de ${ano}`
  }

  const COL_DIM     = 156
  const COL_EXPAND  = 24
  const COL_VAL     = 96
  const level0Field = FAT_FIELDS[0]
  const canExpand0  = maxNivel > 0 && !!level0Field

  if (loading) {
    return (
      <Card noPadding>
        <div className="px-3 py-2 border-b border-surface-border">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
            Estoque por Faturamento
          </p>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      </Card>
    )
  }

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          Estoque por Faturamento
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-20">
          <p className="text-[11px] text-text-muted">Sem dados de faturamento no período</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 400 }}>
          <table
            className="border-collapse text-[11px]"
            style={{ minWidth: COL_EXPAND + COL_DIM + periodos.length * COL_VAL * 2 + COL_VAL + 20 }}
          >
            <thead className="sticky top-0 z-10 bg-surface-light">
              <tr>
                {/* Expand col + Material col — rowspan 2, sticky left */}
                <th
                  rowSpan={2}
                  style={{ width: COL_EXPAND, minWidth: COL_EXPAND, left: 0 }}
                  className="sticky z-20 bg-surface-light border-b border-surface-border"
                />
                <th
                  rowSpan={2}
                  className="sticky z-20 bg-surface-light text-left px-3 py-1.5 text-text-muted font-medium border-b border-r border-surface-border cursor-pointer select-none hover:text-text-primary transition-colors"
                  style={{ minWidth: COL_DIM, width: COL_DIM, left: COL_EXPAND }}
                  onClick={() => handleSort('nome')}
                >
                  {FAT_HEADERS[0]} <SortIcon col="nome" />
                </th>
                {periodos.map(p => (
                  <th
                    key={p}
                    colSpan={2}
                    className="text-center px-2 py-1.5 text-text-muted font-medium border-b border-r border-surface-border capitalize whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors"
                    style={{ minWidth: COL_VAL * 2 }}
                    onClick={() => handleSort(p)}
                  >
                    {periodoLabel(p)} <SortIcon col={p} />
                  </th>
                ))}
                <th rowSpan={2} className="text-right px-2 py-1.5 text-text-muted font-medium border-b border-l border-surface-border whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors" style={{ minWidth: COL_VAL }} onClick={() => handleSort('total')}>
                  Total <SortIcon col="total" />
                </th>
              </tr>
              <tr>
                {periodos.map(p => (
                  <Fragment key={p}>
                    <th className="text-right px-2 py-1 text-text-muted font-medium border-b border-surface-border whitespace-nowrap" style={{ minWidth: COL_VAL }}>
                      Qtde
                    </th>
                    <th className="text-right px-2 py-1 text-text-muted font-medium border-b border-r border-surface-border whitespace-nowrap" style={{ minWidth: COL_VAL }}>
                      Total
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item, idx) => {
                const key        = buildRowKey([], 0, item.value)
                const isExpanded = expandedKeys.has(key)
                const isSelected = isRowActive(0, item.value, level0Field, [], filtros, true)
                const rowTotal   = periodos.reduce((s, p) => s + (pivot[item.value]?.[p]?.total ?? 0), 0)

                return (
                  <Fragment key={item.value}>
                    <tr className={cn(
                      'border-b border-surface-border/40 hover:bg-surface-light/40 transition-colors',
                      idx % 2 === 1 && !isSelected && 'bg-surface-light/15',
                      isSelected && 'bg-brand/10',
                    )}>
                      {/* Expand icon — sticky left */}
                      <td
                        className="sticky z-[5] bg-surface px-1 text-center cursor-pointer"
                        style={{ left: 0 }}
                        onClick={() => { if (canExpand0) toggleExpand(key) }}
                      >
                        {canExpand0 ? (
                          isExpanded
                            ? <ChevronDown size={10} className="text-brand/70 mx-auto" />
                            : <ChevronRight size={10} className="text-text-muted hover:text-brand mx-auto transition-colors" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 inline-block" />
                        )}
                      </td>
                      {/* Label — sticky left */}
                      <td
                        className={cn(
                          'sticky z-[5] bg-surface px-3 py-1 border-r border-surface-border cursor-pointer',
                          isSelected && 'border-l-2 border-l-brand',
                        )}
                        style={{ maxWidth: COL_DIM, left: COL_EXPAND }}
                        onClick={() => applyClickFilter(0, item.value, level0Field, [], filtros, onFilter, true)}
                        title={item.label}
                      >
                        <span className={cn(
                          'text-[11px] block truncate',
                          isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                        )}>
                          {sanitize(item.label)}
                        </span>
                      </td>
                      {/* Células de período */}
                      {periodos.map(p => {
                        const cell = pivot[item.value]?.[p]
                        return (
                          <Fragment key={p}>
                            <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary">
                              {cell ? fmtNum(cell.quantidade) : ''}
                            </td>
                            <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary border-r border-surface-border/30">
                              {cell ? fmtNum(cell.total) : ''}
                            </td>
                          </Fragment>
                        )
                      })}
                      <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary font-medium border-l border-surface-border/30">
                        {rowTotal ? fmtNum(rowTotal) : '—'}
                      </td>
                    </tr>

                    {/* Filhos inline */}
                    {isExpanded && level0Field && (
                      <InlineMatrizRows
                        parentDrill={buildChildDrill([], 0, level0Field, item.value, item.label)}
                        periodos={periodos}
                        depth={1}
                        maxNivel={maxNivel}
                        expandedKeys={expandedKeys}
                        onToggleExpand={toggleExpand}
                        filtros={filtros}
                        onFilter={onFilter}
                        COL_DIM={COL_DIM}
                      />
                    )}
                  </Fragment>
                )
              })}

              {/* Linha de total */}
              <tr className="bg-surface-light border-t-2 border-surface-border font-semibold sticky bottom-0">
                <td className="sticky z-[5] bg-surface-light" style={{ left: 0 }} />
                <td className="sticky z-[5] bg-surface-light px-3 py-1.5 text-text-secondary border-r border-surface-border" style={{ left: COL_EXPAND }}>Total</td>
                {periodos.map(p => {
                  const t = totaisPeriodo[p]
                  return (
                    <Fragment key={p}>
                      <td className="px-2 py-1.5 text-right tabular-nums text-text-primary">
                        {t ? fmtNum(t.quantidade) : ''}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-text-primary border-r border-surface-border/30">
                        {t ? fmtNum(t.total) : ''}
                      </td>
                    </Fragment>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
})

// ─── Filtros inline (desktop) ─────────────────────────────────
const TRIGGER_LG = 'h-9 text-[12px] min-w-[130px]'

function FiltrosInline() {
  const { filtros, setFiltros, resetFiltros } = useEstoqueStore()
  const { data: opts, isLoading } = useEstoqueFiltrosDisponiveis()

  const empresaOpts = useMemo(() => opts?.empresas ?? [], [opts?.empresas])
  const matOpts     = useMemo(() => opts?.materiais ?? [], [opts?.materiais])
  const espOpts     = useMemo(
    () => (opts?.espessuras ?? []).map(e => ({ id: e, label: `${e} cm` })),
    [opts?.espessuras],
  )
  const indOpts = useMemo(
    () => (opts?.composicoes ?? []).map((c, i) => ({ id: i + 1, label: c })),
    [opts?.composicoes],
  )
  const indSelected = useMemo(
    () => filtros.industrializacao.map(v => {
      const idx = (opts?.composicoes ?? []).indexOf(v)
      return idx >= 0 ? idx + 1 : -1
    }).filter(id => id > 0),
    [filtros.industrializacao, opts?.composicoes],
  )
  const handleIndChange = useCallback(
    (ids: number[]) => {
      const labels = ids.map(id => opts?.composicoes?.[id - 1] ?? '').filter(Boolean)
      setFiltros({ industrializacao: labels })
    },
    [opts?.composicoes, setFiltros],
  )
  const blocoOpts = useMemo(
    () => (opts?.blocos ?? []).map(b => ({ id: b, label: String(b) })),
    [opts?.blocos],
  )

  const activeCount =
    filtros.empresas.length + filtros.materiais.length + filtros.blocos.length +
    filtros.espessuras.length + filtros.industrializacao.length + filtros.situacao.length +
    filtros.grupos.length + filtros.chapas.length + filtros.lotes.length + filtros.unidades.length +
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="hidden sm:flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-text-muted mr-1 shrink-0">
        <SlidersHorizontal size={14} />
        <span className="text-[12px] uppercase tracking-widest font-medium">Filtros</span>
      </div>

      <div className="w-px h-5 bg-surface-border shrink-0" />

      <MultiSelect
        label="Empresa"
        options={empresaOpts}
        selected={filtros.empresas}
        onChange={(ids) => setFiltros({ empresas: ids as number[] })}
        loading={isLoading}
        triggerClassName={TRIGGER_LG}
      />
      <MultiSelect
        label="Espessura"
        options={espOpts}
        selected={filtros.espessuras}
        onChange={(ids) => setFiltros({ espessuras: ids as number[] })}
        loading={isLoading}
        triggerClassName={TRIGGER_LG}
      />
      <MultiSelect
        label="Industrialização"
        options={indOpts}
        selected={indSelected}
        onChange={handleIndChange}
        loading={isLoading}
        triggerClassName={TRIGGER_LG}
      />
      <MultiSelect
        label="Material"
        options={matOpts}
        selected={filtros.materiais}
        onChange={(ids) => setFiltros({ materiais: ids as number[] })}
        loading={isLoading}
        triggerClassName={TRIGGER_LG}
      />
      <MultiSelect
        label="Bloco"
        options={blocoOpts}
        selected={filtros.blocos}
        onChange={(ids) => setFiltros({ blocos: ids as number[] })}
        loading={isLoading}
        triggerClassName={TRIGGER_LG}
      />

      <div className="w-px h-5 bg-surface-border shrink-0" />

      {/* Período — apenas para faturamento */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-text-muted uppercase tracking-wider shrink-0">Período</span>
        <input
          type="date"
          value={filtros.data_ini}
          max={today}
          onChange={(e) => setFiltros({ data_ini: e.target.value })}
          className={cn(
            'h-9 px-2.5 rounded-lg text-[12px] w-[138px]',
            'bg-surface-light border border-surface-border text-text-primary',
            'focus:outline-none focus:border-brand/50 transition-colors',
            filtros.data_ini && 'border-brand/40 bg-brand/5',
          )}
        />
        <span className="text-[11px] text-text-muted">até</span>
        <input
          type="date"
          value={filtros.data_fim}
          max={today}
          onChange={(e) => setFiltros({ data_fim: e.target.value })}
          className={cn(
            'h-9 px-2.5 rounded-lg text-[12px] w-[138px]',
            'bg-surface-light border border-surface-border text-text-primary',
            'focus:outline-none focus:border-brand/50 transition-colors',
            filtros.data_fim && 'border-brand/40 bg-brand/5',
          )}
        />
      </div>

      {activeCount > 0 && (
        <button
          onClick={resetFiltros}
          className={cn(
            'ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium',
            'text-status-danger/80 hover:text-status-danger',
            'bg-status-danger/5 hover:bg-status-danger/10',
            'border border-status-danger/20 hover:border-status-danger/40',
            'transition-all duration-150 shrink-0',
          )}
        >
          <RefreshCw size={11} />
          Limpar {activeCount}
        </button>
      )}
    </div>
  )
}

// ─── Drawer mobile ────────────────────────────────────────────
interface MobileDrawerProps {
  open:    boolean
  onClose: () => void
}

const MobileDrawer = memo(function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { filtros, setFiltros, resetFiltros } = useEstoqueStore()
  const { data: opts, isLoading } = useEstoqueFiltrosDisponiveis()

  const empresaOpts = useMemo(() => opts?.empresas ?? [], [opts?.empresas])
  const matOpts     = useMemo(() => opts?.materiais ?? [], [opts?.materiais])
  const espOpts     = useMemo(
    () => (opts?.espessuras ?? []).map(e => ({ id: e, label: `${e} cm` })),
    [opts?.espessuras],
  )
  const indOpts = useMemo(
    () => (opts?.composicoes ?? []).map((c, i) => ({ id: i + 1, label: c })),
    [opts?.composicoes],
  )
  const indSelected = useMemo(
    () => filtros.industrializacao.map(v => {
      const idx = (opts?.composicoes ?? []).indexOf(v)
      return idx >= 0 ? idx + 1 : -1
    }).filter(id => id > 0),
    [filtros.industrializacao, opts?.composicoes],
  )
  const handleIndChangeMobile = useCallback(
    (ids: number[]) => {
      const labels = ids.map(id => opts?.composicoes?.[id - 1] ?? '').filter(Boolean)
      setFiltros({ industrializacao: labels })
    },
    [opts?.composicoes, setFiltros],
  )
  const blocoOpts = useMemo(
    () => (opts?.blocos ?? []).map(b => ({ id: b, label: String(b) })),
    [opts?.blocos],
  )

  const activeCount =
    filtros.empresas.length + filtros.materiais.length + filtros.blocos.length +
    filtros.espessuras.length + filtros.industrializacao.length +
    filtros.grupos.length + filtros.chapas.length + filtros.lotes.length + filtros.unidades.length +
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'sm:hidden fixed top-0 right-0 h-full z-50 w-[85vw] max-w-[320px]',
          'bg-surface border-l border-surface-border shadow-2xl',
          'overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <SlidersHorizontal size={14} />
            <span className="text-[12px] uppercase tracking-widest font-semibold">Filtros</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand/20 text-brand text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          <MultiSelect label="Empresa" options={empresaOpts} selected={filtros.empresas}
            onChange={(ids) => setFiltros({ empresas: ids as number[] })} loading={isLoading} />
          <MultiSelect label="Espessura" options={espOpts} selected={filtros.espessuras}
            onChange={(ids) => setFiltros({ espessuras: ids as number[] })} loading={isLoading} />
          <MultiSelect label="Industrialização" options={indOpts}
            selected={indSelected} onChange={handleIndChangeMobile} loading={isLoading} />
          <MultiSelect label="Material" options={matOpts} selected={filtros.materiais}
            onChange={(ids) => setFiltros({ materiais: ids as number[] })} loading={isLoading} />
          <MultiSelect label="Bloco" options={blocoOpts} selected={filtros.blocos}
            onChange={(ids) => setFiltros({ blocos: ids as number[] })} loading={isLoading} />

          <div className="w-full h-px bg-surface-border my-1" />
          <p className="text-[9px] text-text-muted uppercase tracking-widest">Período (faturamento)</p>
          <input type="date" value={filtros.data_ini} max={today}
            onChange={(e) => setFiltros({ data_ini: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-surface border border-surface-border text-text-primary focus:outline-none focus:border-brand/50" />
          <input type="date" value={filtros.data_fim} max={today}
            onChange={(e) => setFiltros({ data_fim: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-surface border border-surface-border text-text-primary focus:outline-none focus:border-brand/50" />

          <div className="h-24" />
        </div>

        <div className="sticky bottom-0 z-10 px-4 py-4 bg-surface border-t border-surface-border flex flex-col gap-2">
          {activeCount > 0 && (
            <button onClick={() => { resetFiltros(); onClose() }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-status-danger bg-status-danger/10 border border-status-danger/20 hover:bg-status-danger/20 transition-all">
              <RefreshCw size={12} /> Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-text-secondary bg-surface-light border border-surface-border hover:bg-surface-border transition-all">
            Aplicar e fechar
          </button>
        </div>
      </div>
    </>
  )
})

// ─── Página principal ─────────────────────────────────────────
export function EstoquePage() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { filtros, setFiltros } = useEstoqueStore()

  const activeCount =
    filtros.empresas.length + filtros.materiais.length + filtros.blocos.length +
    filtros.espessuras.length + filtros.industrializacao.length + filtros.situacao.length +
    filtros.grupos.length + filtros.chapas.length + filtros.lotes.length + filtros.unidades.length +
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)

  const [matrizSort, setMatrizSort] = useState<MatrizSort>({ col: null, dir: null })
  const { data: kpiData,    isLoading: kpiLoading   } = useEstoqueKpi()
  const { data: chapaData,  isLoading: chapaLoading  } = useEstoqueChapa()
  const { data: blocoData,  isLoading: blocoLoading  } = useEstoqueBloco()
  const { data: matrizData, isLoading: matrizLoading } = useEstoqueFaturamentoMatriz(matrizSort)

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">

      {/* ── Filtros ─────────────────────────────────────────── */}
      <ErrorBoundary>
        <div className="hidden sm:block rounded-xl bg-surface border border-surface-border px-4 py-3 card-glow">
          <FiltrosInline />
        </div>
        <div className="sm:hidden h-0 overflow-hidden" aria-hidden="true">
          <FiltrosInline />
        </div>
      </ErrorBoundary>

      {/* ── Cards KPI ───────────────────────────────────────── */}
      <ErrorBoundary>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiBlock
            title="Custo Total"
            value={formatCurrency(kpiData?.custoTotal ?? 0, true)}
            icon={TrendingDown}
            accent="text-brand"
            loading={kpiLoading}
          />
          <KpiBlock
            title="Total M²"
            value={formatNumber(kpiData?.totalM2 ?? 0)}
            subtitle={`Qtde: ${formatNumber(kpiData?.qtdM2 ?? 0, 0)}`}
            icon={Grid3X3}
            accent="text-chart-blue"
            loading={kpiLoading}
          />
          <KpiBlock
            title="Total M³"
            value={fmtNum(kpiData?.totalM3 ?? 0)}
            subtitle={`Qtde: ${fmtInt(kpiData?.qtdM3 ?? 0)}`}
            icon={Box}
            accent="text-chart-purple"
            loading={kpiLoading}
          />
          <KpiBlock
            title="Cavalete"
            value={String(kpiData?.cavaletes ?? 0)}
            icon={LayoutTemplate}
            accent="text-chart-orange"
            loading={kpiLoading}
          />
        </div>
      </ErrorBoundary>

      {/* ── Tabelas CHAPA + BLOCO ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ErrorBoundary>
          <HierarchyTable
            title="Chapa / Recortado"
            headers={CHAPA_HEADERS}
            fields={CHAPA_FIELDS}
            endpoint="chapa"
            data={chapaData}
            loading={chapaLoading}
            filtros={filtros}
            onFilter={setFiltros}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <HierarchyTable
            title="Bloco"
            headers={BLOCO_HEADERS}
            fields={BLOCO_FIELDS}
            endpoint="bloco"
            data={blocoData}
            loading={blocoLoading}
            filtros={filtros}
            onFilter={setFiltros}
          />
        </ErrorBoundary>
      </div>

      {/* ── Matriz faturamento ───────────────────────────────── */}
      <ErrorBoundary>
        <HierarchyMatriz
          data={matrizData}
          loading={matrizLoading}
          filtros={filtros}
          onFilter={setFiltros}
          onSortChange={setMatrizSort}
        />
      </ErrorBoundary>

      {/* ── Drawer mobile ───────────────────────────────────── */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* ── Botão flutuante mobile ───────────────────────────── */}
      <button
        onClick={() => setDrawerOpen(v => !v)}
        className={cn(
          'sm:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl',
          'flex items-center justify-center transition-all duration-200 active:scale-95',
          activeCount > 0
            ? 'bg-brand shadow-brand/30 text-surface-dark'
            : 'bg-surface border border-surface-border/80 text-text-muted hover:border-brand/40 hover:text-brand',
        )}
        aria-label="Abrir filtros"
      >
        <Filter size={22} />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-status-danger text-white text-[10px] font-bold flex items-center justify-center shadow">
            {activeCount > 9 ? '9+' : activeCount}
          </span>
        )}
      </button>
    </div>
  )
}
