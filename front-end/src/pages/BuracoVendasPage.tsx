import { memo, useMemo, useState, useCallback, useEffect, Fragment } from 'react'
import {
  SlidersHorizontal, RefreshCw, Filter, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useBVStore } from '@/store/buraco-vendas.store'
import {
  useBVSequencia,
  useBVSequenciaChildren,
  useBVEstoqueFaturamento,
  useBVEstoqueFaturamentoChildren,
  useBVMateriaisComprados,
  useBVChapa,
  useBVBloco,
  useBVTableChildren,
  useBVUfs,
  useBVMercados,
} from '@/hooks/useBuracoVendasData'
import { useFiltrosDisponiveis } from '@/hooks/useFiltrosDisponiveis'
import type {
  BuracoVendasFiltros,
  BVMaterialComprado,
  EstoqueMatrizResult,
  EstoqueTableResult,
  EstoqueDrillState,
  EstoqueDrillNode,
  MatrizSort,
} from '@/types'

// ─── Helpers de formatação ────────────────────────────────────
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmtNum = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtInt = (v: number) =>
  Math.round(v).toLocaleString('pt-BR')

const fmtCur = (v: number) =>
  formatCurrency(v)

const sanitize = (s: string) => s.replace(/\?/g, '').trim()

// ─── Hierarquias ─────────────────────────────────────────────
// Sequência de Vendas: nivel=0=Cliente, nivel=1=Pedido(folha)
const SEQ_FIELDS  = ['drill_cod_cliente']  // nivel=0 usa este campo para drill

// Estoque por Faturamento (mesma hierarquia da tela de Estoque)
const FAT_FIELDS  = ['drill_cod_ma', 'drill_unidade', 'drill_cod_cliente']

// Chapa / Bloco (mesma hierarquia da tela de Estoque)
const CHAPA_FIELDS   = ['drill_cod_ma','drill_bloco','drill_grp','drill_esp','drill_ind','drill_cod_estq','drill_lote']
const CHAPA_HEADERS  = ['Material','Bloco','Grupo','Espessura','Industrialização','Chapa','Lote','Unidade']
const BLOCO_FIELDS   = ['drill_cod_ma','drill_bloco']
const BLOCO_HEADERS  = ['Material','Bloco','Unidade']

// ─── Helpers de drill inline ──────────────────────────────────
function buildRowKey(path: EstoqueDrillNode[], level: number, value: string | number): string {
  const p = path.map(n => `${n.nivel}:${n.value}`).join('/')
  return p ? `${p}/${level}:${value}` : `${level}:${value}`
}

function buildChildDrill(
  path:  EstoqueDrillNode[],
  level: number,
  field: string,
  value: string | number,
  label: string,
): EstoqueDrillState {
  const node: EstoqueDrillNode = { nivel: level, label, field, value }
  return { nivel: level + 1, path: [...path, node] }
}

// ─── Click filter e isActive — contexto BV ───────────────────
// Para Chapa/Bloco: click → toggle material em bvFiltros.materiais
function isBVTableRowActive(
  field:   string | undefined,
  value:   string | number,
  path:    EstoqueDrillNode[],
  filtros: BuracoVendasFiltros,
): boolean {
  if (field === 'drill_cod_ma') return filtros.materiais.includes(Number(value))
  // Níveis mais profundos: verifica se o material ancestral está ativo
  const matNode = path.find(n => n.field === 'drill_cod_ma')
  if (!matNode) return false
  return filtros.materiais.includes(Number(matNode.value))
}

function applyBVTableFilter(
  field:      string | undefined,
  value:      string | number,
  path:       EstoqueDrillNode[],
  filtros:    BuracoVendasFiltros,
  setFiltros: (p: Partial<BuracoVendasFiltros>) => void,
): void {
  const matId = field === 'drill_cod_ma'
    ? Number(value)
    : Number(path.find(n => n.field === 'drill_cod_ma')?.value ?? 0)
  if (!matId) return
  const arr = filtros.materiais
  setFiltros({ materiais: arr.includes(matId) ? arr.filter(v => v !== matId) : [...arr, matId] })
}

// Para Sequência: click Cliente → toggle em bvFiltros.clientes
function isBVSeqRowActive(
  field:   string | undefined,
  value:   string | number,
  filtros: BuracoVendasFiltros,
): boolean {
  if (field === 'drill_cod_cliente') return filtros.clientes.includes(Number(value))
  return false
}

function applyBVSeqFilter(
  field:      string | undefined,
  value:      string | number,
  filtros:    BuracoVendasFiltros,
  setFiltros: (p: Partial<BuracoVendasFiltros>) => void,
): void {
  if (field !== 'drill_cod_cliente') return
  const id = Number(value)
  const arr = filtros.clientes
  setFiltros({ clientes: arr.includes(id) ? arr.filter(v => v !== id) : [...arr, id] })
}

// Para Fat: Material → materiais, Cliente → clientes
function isBVFatRowActive(
  field:   string | undefined,
  value:   string | number,
  path:    EstoqueDrillNode[],
  filtros: BuracoVendasFiltros,
): boolean {
  if (field === 'drill_cod_ma')      return filtros.materiais.includes(Number(value))
  if (field === 'drill_cod_cliente') return filtros.clientes.includes(Number(value))
  if (!field) {
    // Pedido (folha) — verifica material ancestral
    const matNode = path.find(n => n.field === 'drill_cod_ma')
    if (matNode) return filtros.materiais.includes(Number(matNode.value))
  }
  return false
}

function applyBVFatFilter(
  field:      string | undefined,
  value:      string | number,
  path:       EstoqueDrillNode[],
  filtros:    BuracoVendasFiltros,
  setFiltros: (p: Partial<BuracoVendasFiltros>) => void,
): void {
  if (field === 'drill_cod_ma') {
    const id = Number(value)
    const arr = filtros.materiais
    setFiltros({ materiais: arr.includes(id) ? arr.filter(v => v !== id) : [...arr, id] })
    return
  }
  if (field === 'drill_cod_cliente') {
    const id = Number(value)
    const arr = filtros.clientes
    setFiltros({ clientes: arr.includes(id) ? arr.filter(v => v !== id) : [...arr, id] })
    return
  }
  // Pedido (folha) → togla material ancestral
  const matNode = path.find(n => n.field === 'drill_cod_ma')
  if (!matNode) return
  const matId = Number(matNode.value)
  const arr = filtros.materiais
  setFiltros({ materiais: arr.includes(matId) ? arr.filter(v => v !== matId) : [...arr, matId] })
}

// ─── BVInlineRows — expansão inline para Chapa/Bloco ─────────
interface BVInlineRowsProps {
  endpoint:       'chapa' | 'bloco'
  parentDrill:    EstoqueDrillState
  depth:          number
  fields:         string[]
  maxNivel:       number
  expandedKeys:   Set<string>
  onToggleExpand: (key: string) => void
  filtros:        BuracoVendasFiltros
  onFilter:       (p: Partial<BuracoVendasFiltros>) => void
}

function BVInlineRows({
  endpoint, parentDrill, depth, fields, maxNivel,
  expandedKeys, onToggleExpand, filtros, onFilter,
}: BVInlineRowsProps) {
  const { data, isLoading } = useBVTableChildren(endpoint, parentDrill)
  const currentLevel  = parentDrill.nivel
  const rows          = data?.rows ?? []
  const currentField  = fields[currentLevel]
  const canExpand     = currentLevel < maxNivel && !!currentField

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
        const isSelected = isBVTableRowActive(currentField, row.value, parentDrill.path, filtros)

        return (
          <Fragment key={key}>
            <div
              className={cn(
                'grid grid-cols-[1fr_88px_52px] border-b border-surface-border/20',
                'hover:bg-surface-light/40 transition-colors',
                isSelected && 'bg-brand/10 border-l-2 border-l-brand',
              )}
            >
              <div
                className="flex items-center gap-1 min-w-0 py-1"
                style={{ paddingLeft: 8 + depth * 16 }}
              >
                <button
                  type="button"
                  className="shrink-0 w-4 h-4 flex items-center justify-center"
                  onClick={() => { if (canExpand) onToggleExpand(key) }}
                  tabIndex={canExpand ? 0 : -1}
                >
                  {canExpand ? (
                    isExpanded
                      ? <ChevronDown  size={10} className="text-brand/70" />
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
                  onClick={() => applyBVTableFilter(currentField, row.value, parentDrill.path, filtros, onFilter)}
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
              <BVInlineRows
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

// ─── BVHierarchyTable — Chapa e Bloco ────────────────────────
interface BVHierarchyTableProps {
  title:    string
  headers:  string[]
  fields:   string[]
  endpoint: 'chapa' | 'bloco'
  data?:    EstoqueTableResult
  loading?: boolean
  filtros:  BuracoVendasFiltros
  onFilter: (p: Partial<BuracoVendasFiltros>) => void
}

const BVHierarchyTable = memo(function BVHierarchyTable({
  title, headers, fields, endpoint, data, loading, filtros, onFilter,
}: BVHierarchyTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
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

  const rawRows     = data?.rows     ?? []
  const totais      = data?.totais
  const maxNivel    = data?.maxNivel ?? fields.length
  const level0Field = fields[0]
  const canExpand0  = maxNivel > 0 && !!level0Field

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
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          {title}
        </p>
      </div>

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
            const isSelected = isBVTableRowActive(level0Field, row.value, [], filtros)

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
                    >
                      {canExpand0 ? (
                        isExpanded
                          ? <ChevronDown  size={10} className="text-brand/70" />
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
                      onClick={() => applyBVTableFilter(level0Field, row.value, [], filtros, onFilter)}
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
                  <BVInlineRows
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

// ─── BVSeqInlineRows — Sequência inline children ──────────────
interface BVSeqInlineRowsProps {
  parentDrill:    EstoqueDrillState
  periodos:       string[]
  depth:          number
  expandedKeys:   Set<string>
  onToggleExpand: (key: string) => void
  filtros:        BuracoVendasFiltros
  onFilter:       (p: Partial<BuracoVendasFiltros>) => void
  COL_DIM:        number
}

function BVSeqInlineRows({
  parentDrill, periodos, depth, filtros, COL_DIM,
}: BVSeqInlineRowsProps) {
  const { data, isLoading } = useBVSequenciaChildren(parentDrill)
  const currentLevel = parentDrill.nivel
  const rows         = data?.rows ?? []
  // nivel=1 é folha (Pedido) — sem expansão
  const currentField = SEQ_FIELDS[currentLevel]

  const { itemMap, pivot } = useMemo(() => {
    const im = new Map<string, string>()
    rows.forEach(r => { if (!im.has(String(r.value))) im.set(String(r.value), r.label) })
    const pv: Record<string, Record<string, number>> = {}
    rows.forEach(r => {
      const pk = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      const ik = String(r.value)
      if (!pv[ik]) pv[ik] = {}
      pv[ik][pk] = r.total
    })
    return { itemMap: im, pivot: pv }
  }, [rows])

  if (isLoading) {
    return (
      <tr>
        <td colSpan={2 + periodos.length}>
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
        const isSelected = isBVSeqRowActive(currentField, value, filtros)

        return (
          <tr
            key={key}
            className={cn(
              'border-b border-surface-border/30 hover:bg-surface-light/40 transition-colors',
              isSelected && 'bg-brand/10',
            )}
          >
            <td
              colSpan={2}
              className={cn('sticky z-[5] bg-surface border-r border-surface-border', isSelected && 'border-l-2 border-l-brand')}
              style={{ maxWidth: COL_DIM + 24, paddingLeft: 4 + depth * 14, left: 0 }}
            >
              <div className="flex items-center gap-1 min-w-0 py-1">
                <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 block" />
                </span>
                <span
                  className={cn(
                    'flex-1 text-[11px] truncate pr-2',
                    isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                  )}
                  title={label}
                >
                  {sanitize(label)}
                </span>
              </div>
            </td>
            {periodos.map(p => {
              const total = pivot[value]?.[p]
              return (
                <td
                  key={p}
                  className={cn(
                    'px-2 py-1 text-right tabular-nums text-[11px] border-r border-surface-border/30',
                    total ? 'text-text-primary' : 'text-status-danger/25',
                  )}
                >
                  {total ? fmtCur(total) : '—'}
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}

// ─── BVSequenciaMatriz — Bloco 1 ─────────────────────────────
interface BVSequenciaMatrizProps {
  data?:          EstoqueMatrizResult
  loading?:       boolean
  filtros:        BuracoVendasFiltros
  onFilter:       (p: Partial<BuracoVendasFiltros>) => void
  onSortChange?:  (sort: MatrizSort) => void
}

const BVSequenciaMatriz = memo(function BVSequenciaMatriz({
  data, loading, filtros, onFilter, onSortChange,
}: BVSequenciaMatrizProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  // Notifica o pai sempre que sort mudar → pai repassa ao hook → backend ordena
  useEffect(() => {
    onSortChange?.({ col: sortCol, dir: sortDir })
  }, [sortCol, sortDir, onSortChange])

  const handleSort = useCallback((col: string) => {
    setSortCol(prev => {
      if (prev !== col) { setSortDir('asc'); return col }
      setSortDir(d => {
        if (d === 'asc') return 'desc'
        setSortCol(null)
        return null
      })
      return prev
    })
  }, [])

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const rows     = data?.rows ?? []
  const maxNivel = data?.maxNivel ?? 1

  const { periodos, items, pivot, totaisPeriodo } = useMemo(() => {
    if (!rows.length) return {
      periodos:      [] as string[],
      items:         [] as { value: string; label: string; campoAdicional: string }[],
      pivot:         {} as Record<string, Record<string, number>>,
      totaisPeriodo: {} as Record<string, number>,
    }

    const periodSet = new Set<string>()
    rows.forEach(r => periodSet.add(`${r.ano}-${String(r.mes).padStart(2, '0')}`))
    const periodos = Array.from(periodSet).sort()

    const itemMap  = new Map<string, string>()
    const extraMap = new Map<string, string>()
    rows.forEach(r => {
      const k = String(r.value)
      if (!itemMap.has(k)) {
        itemMap.set(k, r.label)
        extraMap.set(k, r.campoAdicional ?? '')
      }
    })
    const items = Array.from(itemMap.entries()).map(([value, label]) => ({
      value, label, campoAdicional: extraMap.get(value) ?? '',
    }))

    const pivot: Record<string, Record<string, number>> = {}
    const totaisPeriodo: Record<string, number> = {}
    rows.forEach(r => {
      const pk = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      const ik = String(r.value)
      if (!pivot[ik]) pivot[ik] = {}
      pivot[ik][pk] = r.total
      totaisPeriodo[pk] = (totaisPeriodo[pk] ?? 0) + r.total
    })

    return { periodos, items, pivot, totaisPeriodo }
  }, [rows])

  const periodoLabel = (key: string) => {
    const [ano, mes] = key.split('-')
    return `${MESES_ABREV[Number(mes) - 1] ?? mes}/${ano?.slice(2)}`
  }

  // Ordenação feita no backend — items já chegam ordenados conforme sortCol/sortDir
  const sortedItems = items

  const SortIcon = ({ col }: { col: string }) => {
    const active = sortCol === col
    return (
      <span className="inline-flex flex-col ml-1 gap-px align-middle">
        <ChevronUp   size={8} className={active && sortDir === 'asc'  ? 'text-brand' : 'opacity-20'} />
        <ChevronDown size={8} className={active && sortDir === 'desc' ? 'text-brand' : 'opacity-20'} />
      </span>
    )
  }

  const COL_DIM    = 200
  const COL_EXPAND = 24
  const COL_VAL    = 110
  const level0Field = SEQ_FIELDS[0]
  const canExpand0  = maxNivel > 0 && !!level0Field

  if (loading) {
    return (
      <Card noPadding>
        <div className="px-3 py-2 border-b border-surface-border">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
            Sequência de Vendas
          </p>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      </Card>
    )
  }

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          Sequência de Vendas
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-20">
          <p className="text-[11px] text-text-muted">
            Sem dados no período — ajuste os filtros
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 440 }}>
          <table
            className="border-collapse text-[11px]"
            style={{ minWidth: COL_EXPAND + COL_DIM + periodos.length * COL_VAL + 20 }}
          >
            <thead className="sticky top-0 z-10 bg-surface-light">
              <tr>
                <th style={{ width: COL_EXPAND, minWidth: COL_EXPAND, left: 0 }} className="sticky z-20 bg-surface-light border-b border-surface-border" />
                <th
                  className="sticky z-20 bg-surface-light text-left px-3 py-1.5 text-text-muted font-medium border-b border-r border-surface-border cursor-pointer select-none hover:text-text-primary transition-colors"
                  style={{ minWidth: COL_DIM, width: COL_DIM, left: COL_EXPAND }}
                  onClick={() => handleSort('nome')}
                >
                  Nome Cliente <SortIcon col="nome" />
                </th>
                {periodos.map(p => (
                  <th
                    key={p}
                    className="text-right px-2 py-1.5 text-text-muted font-medium border-b border-r border-surface-border whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors"
                    style={{ minWidth: COL_VAL }}
                    onClick={() => handleSort(p)}
                  >
                    {periodoLabel(p)} <SortIcon col={p} />
                  </th>
                ))}
                <th
                  className="text-right px-2 py-1.5 text-text-muted font-medium border-b border-surface-border whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors"
                  style={{ minWidth: COL_VAL }}
                  onClick={() => handleSort('total')}
                >
                  Total <SortIcon col="total" />
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedItems.map((item, idx) => {
                const key        = buildRowKey([], 0, item.value)
                const isExpanded = expandedKeys.has(key)
                const isSelected = isBVSeqRowActive(level0Field, item.value, filtros)
                const rowTotal   = periodos.reduce((s, p) => s + (pivot[item.value]?.[p] ?? 0), 0)

                return (
                  <Fragment key={item.value}>
                    <tr className={cn(
                      'border-b border-surface-border/40 hover:bg-surface-light/40 transition-colors',
                      idx % 2 === 1 && !isSelected && 'bg-surface-light/15',
                      isSelected && 'bg-brand/10',
                    )}>
                      {/* Expand — sticky left */}
                      <td
                        className="sticky z-[5] bg-surface px-1 text-center cursor-pointer"
                        style={{ left: 0 }}
                        onClick={() => { if (canExpand0) toggleExpand(key) }}
                      >
                        {canExpand0 ? (
                          isExpanded
                            ? <ChevronDown  size={10} className="text-brand/70 mx-auto" />
                            : <ChevronRight size={10} className="text-text-muted hover:text-brand mx-auto transition-colors" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 inline-block" />
                        )}
                      </td>
                      {/* Label — sticky left + CAMPO_ADICIONAL como subtítulo quando expandido */}
                      <td
                        className={cn(
                          'sticky z-[5] bg-surface px-3 py-1 border-r border-surface-border cursor-pointer',
                          isSelected && 'border-l-2 border-l-brand',
                        )}
                        style={{ maxWidth: COL_DIM, left: COL_EXPAND }}
                        onClick={() => applyBVSeqFilter(level0Field, item.value, filtros, onFilter)}
                        title={item.label}
                      >
                        <span className={cn(
                          'text-[11px] block truncate',
                          isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                        )}>
                          {sanitize(item.label)}
                        </span>
                        {isExpanded && item.campoAdicional && (
                          <span className="text-[10px] block truncate text-text-muted mt-0.5" title={item.campoAdicional}>
                            {item.campoAdicional}
                          </span>
                        )}
                      </td>
                      {/* Períodos */}
                      {periodos.map(p => {
                        const total = pivot[item.value]?.[p]
                        return (
                          <td
                            key={p}
                            className={cn(
                              'px-2 py-1 text-right tabular-nums border-r border-surface-border/30',
                              total ? 'text-text-primary' : 'text-status-danger/30',
                            )}
                          >
                            {total ? fmtCur(total) : '—'}
                          </td>
                        )
                      })}
                      {/* Total da linha */}
                      <td className="px-2 py-1 text-right tabular-nums text-text-primary font-medium">
                        {fmtCur(rowTotal)}
                      </td>
                    </tr>

                    {isExpanded && level0Field && (
                      <BVSeqInlineRows
                        parentDrill={buildChildDrill([], 0, level0Field, item.value, item.label)}
                        periodos={periodos}
                        depth={1}
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

              {/* Linha de total geral */}
              <tr className="bg-surface-light border-t-2 border-surface-border font-semibold sticky bottom-0">
                <td className="sticky z-[5] bg-surface-light" style={{ left: 0 }} />
                <td className="sticky z-[5] bg-surface-light px-3 py-1.5 text-text-secondary border-r border-surface-border" style={{ left: COL_EXPAND }}>Total</td>
                {periodos.map(p => (
                  <td key={p} className="px-2 py-1.5 text-right tabular-nums text-text-primary border-r border-surface-border/30">
                    {totaisPeriodo[p] ? fmtCur(totaisPeriodo[p]) : '—'}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right tabular-nums text-text-primary">
                  {fmtCur(Object.values(totaisPeriodo).reduce((s, v) => s + v, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
})

// ─── BVFatInlineMatrizRows — Bloco 2 inline children ─────────
interface BVFatInlineMatrizRowsProps {
  parentDrill:    EstoqueDrillState
  periodos:       string[]
  depth:          number
  maxNivel:       number
  expandedKeys:   Set<string>
  onToggleExpand: (key: string) => void
  filtros:        BuracoVendasFiltros
  onFilter:       (p: Partial<BuracoVendasFiltros>) => void
  COL_DIM:        number
}

function BVFatInlineMatrizRows({
  parentDrill, periodos, depth, maxNivel,
  expandedKeys, onToggleExpand, filtros, onFilter, COL_DIM,
}: BVFatInlineMatrizRowsProps) {
  const { data, isLoading } = useBVEstoqueFaturamentoChildren(parentDrill)
  const currentLevel = parentDrill.nivel
  const rows         = data?.rows ?? []
  const currentField = FAT_FIELDS[currentLevel]
  const canExpand    = currentLevel < maxNivel && !!currentField

  const { itemMap, pivot } = useMemo(() => {
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
        const isSelected = isBVFatRowActive(currentField, value, parentDrill.path, filtros)

        return (
          <Fragment key={key}>
            <tr className={cn(
              'border-b border-surface-border/30 hover:bg-surface-light/40 transition-colors',
              isSelected && 'bg-brand/10',
            )}>
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
                        ? <ChevronDown  size={10} className="text-brand/70" />
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
                    onClick={() => applyBVFatFilter(currentField, value, parentDrill.path, filtros, onFilter)}
                    title={label}
                  >
                    {sanitize(label)}
                  </button>
                </div>
              </td>
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
              <BVFatInlineMatrizRows
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

// ─── BVFatHierarchyMatriz — Bloco 2 ──────────────────────────
interface BVFatHierarchyMatrizProps {
  data?:         EstoqueMatrizResult
  loading?:      boolean
  filtros:       BuracoVendasFiltros
  onFilter:      (p: Partial<BuracoVendasFiltros>) => void
  onSortChange?: (sort: MatrizSort) => void
}

const BVFatHierarchyMatriz = memo(function BVFatHierarchyMatriz({
  data, loading, filtros, onFilter, onSortChange,
}: BVFatHierarchyMatrizProps) {
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
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const rows     = data?.rows     ?? []
  const maxNivel = data?.maxNivel ?? 3

  const { periodos, items, pivot, totaisPeriodo } = useMemo(() => {
    if (!rows.length) return {
      periodos: [] as string[],
      items: [] as { value: string; label: string }[],
      pivot: {} as Record<string, Record<string, { quantidade: number; total: number }>>,
      totaisPeriodo: {} as Record<string, { quantidade: number; total: number }>,
    }

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

  const periodoLabel = (key: string) => {
    const [ano, mes] = key.split('-')
    return `${MESES_ABREV[Number(mes) - 1] ?? mes} de ${ano}`
  }

  const COL_DIM    = 156
  const COL_EXPAND = 24
  const COL_VAL    = 96
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
                <th rowSpan={2} style={{ width: COL_EXPAND, minWidth: COL_EXPAND, left: 0 }} className="sticky z-20 bg-surface-light border-b border-surface-border" />
                <th
                  rowSpan={2}
                  className="sticky z-20 bg-surface-light text-left px-3 py-1.5 text-text-muted font-medium border-b border-r border-surface-border cursor-pointer select-none hover:text-text-primary transition-colors"
                  style={{ minWidth: COL_DIM, width: COL_DIM, left: COL_EXPAND }}
                  onClick={() => handleSort('nome')}
                >
                  Material <SortIcon col="nome" />
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
                const isSelected = isBVFatRowActive(level0Field, item.value, [], filtros)
                const rowTotal   = periodos.reduce((s, p) => s + (pivot[item.value]?.[p]?.total ?? 0), 0)

                return (
                  <Fragment key={item.value}>
                    <tr className={cn(
                      'border-b border-surface-border/40 hover:bg-surface-light/40 transition-colors',
                      idx % 2 === 1 && !isSelected && 'bg-surface-light/15',
                      isSelected && 'bg-brand/10',
                    )}>
                      {/* Expand — sticky left */}
                      <td className="sticky z-[5] bg-surface px-1 text-center cursor-pointer" style={{ left: 0 }} onClick={() => { if (canExpand0) toggleExpand(key) }}>
                        {canExpand0 ? (
                          isExpanded
                            ? <ChevronDown  size={10} className="text-brand/70 mx-auto" />
                            : <ChevronRight size={10} className="text-text-muted hover:text-brand mx-auto transition-colors" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 inline-block" />
                        )}
                      </td>
                      {/* Label — sticky left */}
                      <td
                        className={cn('sticky z-[5] bg-surface px-3 py-1 border-r border-surface-border cursor-pointer', isSelected && 'border-l-2 border-l-brand')}
                        style={{ maxWidth: COL_DIM, left: COL_EXPAND }}
                        onClick={() => applyBVFatFilter(level0Field, item.value, [], filtros, onFilter)}
                        title={item.label}
                      >
                        <span className={cn('text-[11px] block truncate', isSelected ? 'text-brand font-medium' : 'text-text-secondary')}>
                          {sanitize(item.label)}
                        </span>
                      </td>
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
                        {rowTotal ? fmtCur(rowTotal) : '—'}
                      </td>
                    </tr>

                    {isExpanded && level0Field && (
                      <BVFatInlineMatrizRows
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

// ─── MateriaisCompradosTable — Bloco 3 ───────────────────────
interface MateriaisCompradosTableProps {
  data?:    BVMaterialComprado[]
  loading?: boolean
}

const MateriaisCompradosTable = memo(function MateriaisCompradosTable({
  data, loading,
}: MateriaisCompradosTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

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

  const rawRows = data ?? []

  const rows = useMemo(() => {
    if (!sortCol || !sortDir) return rawRows
    return [...rawRows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortCol === 'material')      return dir * a.material.localeCompare(b.material)
      if (sortCol === 'ultimaVenda')   return dir * (a.ultimaVenda ?? '').localeCompare(b.ultimaVenda ?? '')
      if (sortCol === 'qtdeM2')        return dir * (a.qtdeM2 - b.qtdeM2)
      if (sortCol === 'qtdeM3')        return dir * (a.qtdeM3 - b.qtdeM3)
      if (sortCol === 'qtdePc')        return dir * (a.qtdePc - b.qtdePc)
      if (sortCol === 'numPedidos')    return dir * (a.numPedidos - b.numPedidos)
      if (sortCol === 'totalFaturado') return dir * (a.totalFaturado - b.totalFaturado)
      return 0
    })
  }, [rawRows, sortCol, sortDir])

  const hBtn = (col: string, label: string, right = false) => (
    <button type="button" onClick={() => handleSort(col)}
      className={cn(
        'flex items-center gap-0.5 text-[10px] text-text-muted uppercase tracking-wider hover:text-text-secondary',
        right ? 'justify-end' : '',
      )}>
      {right && <SortIcon col={col} />}
      {label}
      {!right && <SortIcon col={col} />}
    </button>
  )

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          Materiais Comprados
        </p>
      </div>

      {/* Cabeçalho */}
      <div
        className="grid px-3 py-1.5 bg-surface-light border-b border-surface-border shrink-0"
        style={{ gridTemplateColumns: '1fr 96px 72px 72px 52px 52px 108px' }}
      >
        <span className="pl-1">{hBtn('material', 'Material')}</span>
        <span className="text-right pr-2">{hBtn('ultimaVenda', 'Última Venda', true)}</span>
        <span className="text-right pr-2">{hBtn('qtdeM2', 'M²', true)}</span>
        <span className="text-right pr-2">{hBtn('qtdeM3', 'M³', true)}</span>
        <span className="text-right pr-2">{hBtn('qtdePc', 'PC', true)}</span>
        <span className="text-right pr-2">{hBtn('numPedidos', 'Pedidos', true)}</span>
        <span className="text-right pr-1">{hBtn('totalFaturado', 'Total Faturado', true)}</span>
      </div>

      <div className="overflow-y-auto flex-1" style={{ maxHeight: 320 }}>
        {loading ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[11px] text-text-muted">Sem dados</p>
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={row.materialId}
              className={cn(
                'grid border-b border-surface-border/30 hover:bg-surface-light/40 transition-colors',
                idx % 2 === 1 && 'bg-surface-light/15',
              )}
              style={{ gridTemplateColumns: '1fr 96px 72px 72px 52px 52px 108px' }}
            >
              <span className="text-[11px] text-text-secondary truncate pl-3 py-1.5 pr-1" title={row.material}>
                {sanitize(row.material)}
              </span>
              <span className="text-[11px] text-text-muted tabular-nums text-right self-center pr-2">
                {row.ultimaVenda ? formatDate(row.ultimaVenda) : '—'}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {row.qtdeM2 > 0 ? fmtNum(row.qtdeM2) : '—'}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {row.qtdeM3 > 0 ? fmtNum(row.qtdeM3) : '—'}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {fmtInt(row.qtdePc)}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {fmtInt(row.numPedidos)}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-1">
                {fmtCur(row.totalFaturado)}
              </span>
            </div>
          ))
        )}
      </div>

      {!loading && rows.length > 0 && (
        <div
          className="grid px-3 py-1.5 bg-surface-light border-t border-surface-border shrink-0"
          style={{ gridTemplateColumns: '1fr 96px 72px 72px 52px 52px 108px' }}
        >
          <span className="text-[11px] font-semibold text-text-secondary pl-1">Total</span>
          <span />
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtNum(rows.reduce((s, r) => s + r.qtdeM2, 0))}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtNum(rows.reduce((s, r) => s + r.qtdeM3, 0))}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtInt(rows.reduce((s, r) => s + r.qtdePc, 0))}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtInt(rows.reduce((s, r) => s + r.numPedidos, 0))}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-1">
            {fmtCur(rows.reduce((s, r) => s + r.totalFaturado, 0))}
          </span>
        </div>
      )}
    </Card>
  )
})

// ─── BVFiltrosInline ──────────────────────────────────────────
const TRIGGER_LG = 'h-9 text-[12px] min-w-[130px]'

function BVFiltrosInline() {
  const { filtros, setFiltros, resetFiltros } = useBVStore()
  const { data: opts, isLoading: optsLoading } = useFiltrosDisponiveis()
  const { data: ufsRaw  = [] }  = useBVUfs()
  const { data: mercRaw = [] }  = useBVMercados()

  const clienteOpts  = useMemo(() => opts?.clientes  ?? [], [opts])
  const vendedorOpts = useMemo(() => opts?.vendedores ?? [], [opts])
  const matOpts      = useMemo(() => opts?.materiais  ?? [], [opts])

  // UFs — string → index ID
  const ufOpts = useMemo(
    () => ufsRaw.map((uf, i) => ({ id: i + 1, label: uf })),
    [ufsRaw],
  )
  const ufSelected = useMemo(
    () => filtros.ufs.map(v => ufsRaw.indexOf(v) + 1).filter(id => id > 0),
    [filtros.ufs, ufsRaw],
  )
  const handleUfChange = useCallback(
    (ids: number[]) => setFiltros({ ufs: ids.map(id => ufsRaw[id - 1]).filter(Boolean) }),
    [ufsRaw, setFiltros],
  )

  // Mercados — string → index ID
  const mercOpts = useMemo(
    () => mercRaw.map((m, i) => ({ id: i + 1, label: m })),
    [mercRaw],
  )
  const mercSelected = useMemo(
    () => filtros.mercado.map(v => mercRaw.indexOf(v) + 1).filter(id => id > 0),
    [filtros.mercado, mercRaw],
  )
  const handleMercChange = useCallback(
    (ids: number[]) => setFiltros({ mercado: ids.map(id => mercRaw[id - 1]).filter(Boolean) }),
    [mercRaw, setFiltros],
  )

  const activeCount =
    filtros.clientes.length + filtros.vendedores.length + filtros.materiais.length +
    filtros.ufs.length + filtros.municipios.length + filtros.mercado.length +
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
        label="Mercado"
        options={mercOpts}
        selected={mercSelected}
        onChange={handleMercChange}
        loading={optsLoading}
        triggerClassName={TRIGGER_LG}
      />
      <MultiSelect
        label="Vendedor"
        options={vendedorOpts}
        selected={filtros.vendedores}
        onChange={(ids) => setFiltros({ vendedores: ids as number[] })}
        loading={optsLoading}
        triggerClassName={TRIGGER_LG}
      />
      <MultiSelect
        label="Estado"
        options={ufOpts}
        selected={ufSelected}
        onChange={handleUfChange}
        triggerClassName={TRIGGER_LG}
      />
      <MultiSelect
        label="Cliente"
        options={clienteOpts}
        selected={filtros.clientes}
        onChange={(ids) => setFiltros({ clientes: ids as number[] })}
        loading={optsLoading}
        triggerClassName={TRIGGER_LG}
      />
      <MultiSelect
        label="Material"
        options={matOpts}
        selected={filtros.materiais}
        onChange={(ids) => setFiltros({ materiais: ids as number[] })}
        loading={optsLoading}
        triggerClassName={TRIGGER_LG}
      />

      <div className="w-px h-5 bg-surface-border shrink-0" />

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
interface BVMobileDrawerProps {
  open:    boolean
  onClose: () => void
}

const BVMobileDrawer = memo(function BVMobileDrawer({ open, onClose }: BVMobileDrawerProps) {
  const { filtros, setFiltros, resetFiltros } = useBVStore()
  const { data: opts, isLoading: optsLoading } = useFiltrosDisponiveis()
  const { data: ufsRaw  = [] } = useBVUfs()
  const { data: mercRaw = [] } = useBVMercados()

  const clienteOpts  = useMemo(() => opts?.clientes  ?? [], [opts])
  const vendedorOpts = useMemo(() => opts?.vendedores ?? [], [opts])
  const matOpts      = useMemo(() => opts?.materiais  ?? [], [opts])

  const ufOpts = useMemo(() => ufsRaw.map((uf, i) => ({ id: i + 1, label: uf })), [ufsRaw])
  const ufSelected = useMemo(
    () => filtros.ufs.map(v => ufsRaw.indexOf(v) + 1).filter(id => id > 0),
    [filtros.ufs, ufsRaw],
  )
  const handleUfChange = useCallback(
    (ids: number[]) => setFiltros({ ufs: ids.map(id => ufsRaw[id - 1]).filter(Boolean) }),
    [ufsRaw, setFiltros],
  )

  const mercOpts = useMemo(() => mercRaw.map((m, i) => ({ id: i + 1, label: m })), [mercRaw])
  const mercSelected = useMemo(
    () => filtros.mercado.map(v => mercRaw.indexOf(v) + 1).filter(id => id > 0),
    [filtros.mercado, mercRaw],
  )
  const handleMercChange = useCallback(
    (ids: number[]) => setFiltros({ mercado: ids.map(id => mercRaw[id - 1]).filter(Boolean) }),
    [mercRaw, setFiltros],
  )

  const activeCount =
    filtros.clientes.length + filtros.vendedores.length + filtros.materiais.length +
    filtros.ufs.length + filtros.mercado.length +
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
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          <MultiSelect label="Mercado"  options={mercOpts}     selected={mercSelected}    onChange={handleMercChange} loading={optsLoading} />
          <MultiSelect label="Vendedor" options={vendedorOpts} selected={filtros.vendedores} onChange={(ids) => setFiltros({ vendedores: ids as number[] })} loading={optsLoading} />
          <MultiSelect label="Estado"   options={ufOpts}       selected={ufSelected}      onChange={handleUfChange} />
          <MultiSelect label="Cliente"  options={clienteOpts}  selected={filtros.clientes}  onChange={(ids) => setFiltros({ clientes: ids as number[] })}  loading={optsLoading} />
          <MultiSelect label="Material" options={matOpts}      selected={filtros.materiais} onChange={(ids) => setFiltros({ materiais: ids as number[] })} loading={optsLoading} />

          <div className="w-full h-px bg-surface-border my-1" />
          <p className="text-[9px] text-text-muted uppercase tracking-widest">Período</p>
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
            <button
              onClick={() => { resetFiltros(); onClose() }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-status-danger bg-status-danger/10 border border-status-danger/20 hover:bg-status-danger/20 transition-all"
            >
              <RefreshCw size={12} /> Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-text-secondary bg-surface-light border border-surface-border hover:bg-surface-border transition-all"
          >
            Aplicar e fechar
          </button>
        </div>
      </div>
    </>
  )
})

// ─── Página principal ─────────────────────────────────────────
export function BuracoVendasPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { filtros, setFiltros } = useBVStore()

  const activeCount =
    filtros.clientes.length + filtros.vendedores.length + filtros.materiais.length +
    filtros.ufs.length + filtros.municipios.length + filtros.mercado.length +
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)

  const [seqSort, setSeqSort] = useState<MatrizSort>({ col: null, dir: null })
  const [fatSort, setFatSort] = useState<MatrizSort>({ col: null, dir: null })
  const { data: seqData,  isLoading: seqLoading  } = useBVSequencia(seqSort)
  const { data: fatData,  isLoading: fatLoading  } = useBVEstoqueFaturamento(fatSort)
  const { data: matData,  isLoading: matLoading  } = useBVMateriaisComprados()
  const { data: chapaData, isLoading: chapaLoading } = useBVChapa()
  const { data: blocoData, isLoading: blocoLoading } = useBVBloco()

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">

      {/* ── Header ────────────────────────────────────────────── */}
      {/* <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
          <TrendingDown size={16} className="text-brand" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[13px] font-display font-bold text-text-primary uppercase tracking-widest">
            Buraco de Vendas
          </h1>
          <p className="text-[10.5px] text-text-muted">Sequência de compras por cliente e posição de estoque</p>
        </div>
      </div> */}

      {/* ── Filtros desktop ──────────────────────────────────── */}
      <ErrorBoundary>
        <div className="hidden sm:block rounded-xl bg-surface border border-surface-border px-4 py-3 card-glow">
          <BVFiltrosInline />
        </div>
      </ErrorBoundary>

      {/* ── Bloco 1: Sequência de Vendas ─────────────────────── */}
      <ErrorBoundary>
        <BVSequenciaMatriz
          data={seqData}
          loading={seqLoading}
          filtros={filtros}
          onFilter={setFiltros}
          onSortChange={setSeqSort}
        />
      </ErrorBoundary>

      {/* ── Bloco 2: Estoque por Faturamento ─────────────────── */}
      <ErrorBoundary>
        <BVFatHierarchyMatriz
          data={fatData}
          loading={fatLoading}
          filtros={filtros}
          onFilter={setFiltros}
          onSortChange={setFatSort}
        />
      </ErrorBoundary>




      {/* ── Blocos 4 e 5: Chapa + Bloco ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ErrorBoundary>
          <MateriaisCompradosTable data={matData} loading={matLoading} />
        </ErrorBoundary>
        <ErrorBoundary>
          <BVHierarchyTable
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
          <BVHierarchyTable
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

      {/* ── Drawer mobile ────────────────────────────────────── */}
      <BVMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

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