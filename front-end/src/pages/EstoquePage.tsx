import { memo, useMemo, useState, useCallback, useEffect, Fragment } from 'react'
import {
  SlidersHorizontal, RefreshCw, Filter, ChevronRight,
  TrendingDown, Grid3X3, Box, LayoutTemplate, ChevronsRight,
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
} from '@/hooks/useEstoqueData'
import type {
  EstoqueTableResult,
  EstoqueMatrizResult, EstoqueDrillState, EstoqueDrillNode,
} from '@/types'

// ─── Helpers ─────────────────────────────────────────────────
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmtNum = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtInt = (v: number) =>
  Math.round(v).toLocaleString('pt-BR')

const sanitize = (s: string) =>
  s.replace(/\?/g, '').trim()

// Mapeamento de campo → label de coluna por nivel para cada tabela
const CHAPA_HEADERS = [
  'Material', 'Bloco', 'Grupo', 'Espessura', 'Industrialização', 'Chapa', 'Lote', 'Unidade',
]
const CHAPA_FIELDS = [
  'drill_cod_ma','drill_bloco','drill_grp','drill_esp','drill_ind','drill_chapa','drill_lote',
]
const BLOCO_HEADERS  = ['Material', 'Bloco', 'Unidade']
const BLOCO_FIELDS   = ['drill_cod_ma', 'drill_bloco']
const FAT_HEADERS    = ['Material', 'Unidade', 'Cliente', 'Pedido']
const FAT_FIELDS     = ['drill_cod_ma', 'drill_unidade', 'drill_cod_cliente']

// ─── Componente KPI card (horizontal) ────────────────────────
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

// ─── Breadcrumb de drill-down ─────────────────────────────────
interface DrillBreadcrumbProps {
  drill:   EstoqueDrillState
  headers: string[]
  onGoto:  (nivel: number) => void
}

function DrillBreadcrumb({ drill, headers, onGoto }: DrillBreadcrumbProps) {
  if (!drill.path.length) return null
  return (
    <div className="flex items-center gap-1 flex-wrap px-3 py-1.5 bg-brand/5 border-b border-brand/20">
      <button
        onClick={() => onGoto(0)}
        className="text-[10px] text-brand hover:underline font-medium"
      >
        {headers[0]}
      </button>
      {drill.path.map((node) => (
        <Fragment key={node.nivel}>
          <ChevronRight size={10} className="text-text-muted shrink-0" />
          <button
            onClick={() => onGoto(node.nivel + 1)}
            className="text-[10px] text-brand hover:underline font-medium max-w-[120px] truncate"
            title={String(node.label)}
          >
            {sanitize(String(node.label))}
          </button>
        </Fragment>
      ))}
      {drill.nivel < (drill.path.length > 0 ? drill.path[drill.path.length - 1].nivel + 2 : 1) && (
        <span className="text-[10px] text-text-muted ml-1">→ {headers[drill.nivel] ?? ''}</span>
      )}
    </div>
  )
}

// ─── Tabela com drill-down ────────────────────────────────────
interface DrillTableProps {
  title:    string
  headers:  string[]
  fields:   string[]
  data?:    EstoqueTableResult
  loading?: boolean
  drill:    EstoqueDrillState
  onDrillInto: (node: EstoqueDrillNode) => void
  onDrillOut:  (nivel: number) => void
}

const DrillTable = memo(function DrillTable({
  title, headers, fields, data, loading, drill, onDrillInto, onDrillOut,
}: DrillTableProps) {
  const rows     = data?.rows     ?? []
  const totais   = data?.totais
  const maxNivel = data?.maxNivel ?? headers.length - 1
  const canDrill = drill.nivel < maxNivel

  const colHeader = headers[drill.nivel] ?? 'Item'

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      {/* Título + nível atual */}
      <div className="px-3 py-2 border-b border-surface-border shrink-0 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest truncate">
          {title}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {/* Botão voltar ao topo */}
          {drill.nivel > 0 && (
            <button
              onClick={() => onDrillOut(0)}
              className="text-[10px] text-brand/70 hover:text-brand flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-brand/10 transition-colors"
              title="Voltar ao início"
            >
              ↑ {headers[0]}
            </button>
          )}
          <span className="text-[9px] text-text-muted bg-surface-light px-1.5 py-0.5 rounded">
            N{drill.nivel + 1}/{maxNivel + 1}
          </span>
        </div>
      </div>

      {/* Breadcrumb */}
      <DrillBreadcrumb drill={drill} headers={headers} onGoto={onDrillOut} />

      {/* Cabeçalho fixo */}
      <div className={cn(
        'grid gap-1 px-3 py-1.5 bg-surface-light border-b border-surface-border shrink-0',
        canDrill ? 'grid-cols-[16px_1fr_80px_52px]' : 'grid-cols-[1fr_80px_52px]',
      )}>
        {canDrill && <span />}
        <span className="text-[10px] text-text-muted uppercase tracking-wider">{colHeader}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider text-right">Metragem</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider text-right">PC</span>
      </div>

      {/* Corpo */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 300 }}>
        {loading ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[11px] text-text-muted">Sem dados</p>
          </div>
        ) : (
          rows.map((r, idx) => (
            <div
              key={`${r.value}-${idx}`}
              className={cn(
                'grid gap-1 px-3 py-1 border-b border-surface-border/30',
                canDrill ? 'grid-cols-[16px_1fr_80px_52px]' : 'grid-cols-[1fr_80px_52px]',
                idx % 2 === 1 && 'bg-surface-light/20',
              )}
            >
              {canDrill && (
                <button
                  onClick={() => onDrillInto({
                    nivel: drill.nivel,
                    label: r.label,
                    field: fields[drill.nivel],
                    value: r.value,
                  })}
                  className="flex items-center justify-center text-text-muted hover:text-brand transition-colors"
                  title={`Detalhar ${colHeader}: ${r.label}`}
                >
                  <ChevronsRight size={11} />
                </button>
              )}
              <span className="text-[11px] text-text-secondary truncate pr-1 self-center"
                title={r.label}>
                {sanitize(r.label)}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center">
                {fmtNum(r.metragem)}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center">
                {fmtInt(r.pc)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Totais */}
      {!loading && totais && (
        <div className={cn(
          'grid gap-1 px-3 py-1.5 bg-surface-light border-t border-surface-border shrink-0',
          canDrill ? 'grid-cols-[16px_1fr_80px_52px]' : 'grid-cols-[1fr_80px_52px]',
        )}>
          {canDrill && <span />}
          <span className="text-[11px] font-semibold text-text-secondary">Total</span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right">
            {fmtNum(totais.metragem)}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right">
            {fmtInt(totais.pc)}
          </span>
        </div>
      )}
    </Card>
  )
})

// ─── Matriz Faturamento com drill-down ───────────────────────
interface MatrizProps {
  data?:    EstoqueMatrizResult
  loading?: boolean
  drill:    EstoqueDrillState
  onDrillInto: (node: EstoqueDrillNode) => void
  onDrillOut:  (nivel: number) => void
}

const EstoqueMatriz = memo(function EstoqueMatriz({
  data, loading, drill, onDrillInto, onDrillOut,
}: MatrizProps) {
  const rows     = data?.rows     ?? []
  const maxNivel = data?.maxNivel ?? 3
  const canDrill = drill.nivel < maxNivel
  const colHeader = FAT_HEADERS[drill.nivel] ?? 'Item'

  const { periodos, items, pivot, totaisPeriodo } = useMemo(() => {
    if (!rows.length) return { periodos: [], items: [], pivot: {}, totaisPeriodo: {} }

    const periodSet = new Set<string>()
    rows.forEach(r => periodSet.add(`${r.ano}-${String(r.mes).padStart(2, '0')}`))
    const periodos = Array.from(periodSet).sort()

    const itemMap = new Map<string, string>()
    rows.forEach(r => {
      const key = String(r.value)
      if (!itemMap.has(key)) itemMap.set(key, r.label)
    })
    const items = Array.from(itemMap.entries()).map(([value, label]) => ({ value, label }))

    const pivot: Record<string, Record<string, { quantidade: number; total: number }>> = {}
    const totaisPeriodo: Record<string, { quantidade: number; total: number }> = {}

    rows.forEach(r => {
      const pKey = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      const iKey = String(r.value)
      if (!pivot[iKey]) pivot[iKey] = {}
      pivot[iKey][pKey] = { quantidade: r.quantidade, total: r.total }
      if (!totaisPeriodo[pKey]) totaisPeriodo[pKey] = { quantidade: 0, total: 0 }
      totaisPeriodo[pKey].quantidade += r.quantidade
      totaisPeriodo[pKey].total      += r.total
    })

    return { periodos, items, pivot, totaisPeriodo }
  }, [rows])

  function periodoLabel(key: string) {
    const [ano, mes] = key.split('-')
    return `${MESES_ABREV[Number(mes) - 1] ?? mes} de ${ano}`
  }

  const COL_DIM = 180
  const COL_VAL = 100

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
      {/* Título */}
      <div className="px-3 py-2 border-b border-surface-border shrink-0 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          Estoque por Faturamento
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {drill.nivel > 0 && (
            <button
              onClick={() => onDrillOut(0)}
              className="text-[10px] text-brand/70 hover:text-brand flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-brand/10 transition-colors"
            >
              ↑ {FAT_HEADERS[0]}
            </button>
          )}
          <span className="text-[9px] text-text-muted bg-surface-light px-1.5 py-0.5 rounded">
            N{drill.nivel + 1}/{maxNivel + 1}
          </span>
        </div>
      </div>

      {/* Breadcrumb */}
      <DrillBreadcrumb drill={drill} headers={FAT_HEADERS} onGoto={onDrillOut} />

      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-20">
          <p className="text-[11px] text-text-muted">Sem dados de faturamento no período</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 380 }}>
          <table
            className="border-collapse text-[11px]"
            style={{ minWidth: COL_DIM + periodos.length * COL_VAL * 2 + 20 }}
          >
            <thead className="sticky top-0 z-10 bg-surface-light">
              <tr>
                {canDrill && <th rowSpan={2} style={{ width: 20 }} className="border-b border-r border-surface-border" />}
                <th
                  rowSpan={2}
                  className="text-left px-3 py-1.5 text-text-muted font-medium border-b border-r border-surface-border"
                  style={{ minWidth: COL_DIM, width: COL_DIM }}
                >
                  {colHeader}
                </th>
                {periodos.map(p => (
                  <th
                    key={p}
                    colSpan={2}
                    className="text-center px-2 py-1.5 text-text-muted font-medium border-b border-r border-surface-border capitalize whitespace-nowrap"
                    style={{ minWidth: COL_VAL * 2 }}
                  >
                    {periodoLabel(p)}
                  </th>
                ))}
              </tr>
              <tr>
                {periodos.map(p => (
                  <Fragment key={p}>
                    <th className="text-right px-2 py-1 text-text-muted font-medium border-b border-surface-border whitespace-nowrap"
                      style={{ minWidth: COL_VAL }}>Quantidade</th>
                    <th className="text-right px-2 py-1 text-text-muted font-medium border-b border-r border-surface-border whitespace-nowrap"
                      style={{ minWidth: COL_VAL }}>Total Faturado</th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.value}
                  className={cn(
                    'border-b border-surface-border/40 hover:bg-surface-light transition-colors',
                    idx % 2 === 1 && 'bg-surface-light/20',
                  )}
                >
                  {canDrill && (
                    <td className="px-1">
                      <button
                        onClick={() => onDrillInto({
                          nivel: drill.nivel,
                          label: item.label,
                          field: FAT_FIELDS[drill.nivel],
                          value: item.value,
                        })}
                        className="flex items-center justify-center text-text-muted hover:text-brand transition-colors"
                        title={`Detalhar: ${item.label}`}
                      >
                        <ChevronsRight size={11} />
                      </button>
                    </td>
                  )}
                  <td
                    className="px-3 py-1 text-text-secondary border-r border-surface-border truncate"
                    style={{ maxWidth: COL_DIM }}
                    title={item.label}
                  >
                    {sanitize(item.label)}
                  </td>
                  {periodos.map(p => {
                    const cell = pivot[item.value]?.[p]
                    return (
                      <Fragment key={p}>
                        <td className="px-2 py-1 text-right tabular-nums text-text-primary">
                          {cell ? fmtNum(cell.quantidade) : ''}
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums text-text-primary border-r border-surface-border/30">
                          {cell ? fmtNum(cell.total) : ''}
                        </td>
                      </Fragment>
                    )
                  })}
                </tr>
              ))}

              {/* Total rodapé */}
              <tr className="bg-surface-light border-t-2 border-surface-border font-semibold sticky bottom-0">
                {canDrill && <td />}
                <td className="px-3 py-1.5 text-text-secondary border-r border-surface-border">Total</td>
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
function FiltrosInline() {
  const { filtros, setFiltros, resetFiltros } = useEstoqueStore()
  const { data: opts, isLoading } = useEstoqueFiltrosDisponiveis()

  const empresaOpts = useMemo(
    () => opts?.empresas ?? [],
    [opts?.empresas],
  )
  const matOpts = useMemo(() => opts?.materiais ?? [], [opts?.materiais])
  const espOpts = useMemo(
    () => (opts?.espessuras ?? []).map(e => ({ id: e, label: `${e} cm` })),
    [opts?.espessuras],
  )
  // Industrialização: strings mapeadas para IDs numéricos (1-based index)
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
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="hidden sm:flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-text-muted mr-1 shrink-0">
        <SlidersHorizontal size={14} />
        <span className="text-[11px] uppercase tracking-widest font-medium">Filtros</span>
      </div>

      <div className="w-px h-5 bg-surface-border shrink-0" />

      <MultiSelect
        label="Empresa"
        options={empresaOpts}
        selected={filtros.empresas}
        onChange={(ids) => setFiltros({ empresas: ids as number[] })}
        loading={isLoading}
      />
      <MultiSelect
        label="Espessura"
        options={espOpts}
        selected={filtros.espessuras}
        onChange={(ids) => setFiltros({ espessuras: ids as number[] })}
        loading={isLoading}
      />
      <MultiSelect
        label="Industrialização"
        options={indOpts}
        selected={indSelected}
        onChange={handleIndChange}
        loading={isLoading}
      />
      <MultiSelect
        label="Material"
        options={matOpts}
        selected={filtros.materiais}
        onChange={(ids) => setFiltros({ materiais: ids as number[] })}
        loading={isLoading}
      />
      <MultiSelect
        label="Bloco"
        options={blocoOpts}
        selected={filtros.blocos}
        onChange={(ids) => setFiltros({ blocos: ids as number[] })}
        loading={isLoading}
      />

      <div className="w-px h-5 bg-surface-border shrink-0" />

      {/* Período — apenas para faturamento */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-text-muted uppercase tracking-wider shrink-0">Período</span>
        <input
          type="date"
          value={filtros.data_ini}
          max={today}
          onChange={(e) => setFiltros({ data_ini: e.target.value })}
          className={cn(
            'h-8 px-2 rounded-lg text-[11.5px] w-[130px]',
            'bg-surface-light border border-surface-border text-text-primary',
            'focus:outline-none focus:border-brand/50 transition-colors',
            filtros.data_ini && 'border-brand/40 bg-brand/5',
          )}
        />
        <span className="text-[10px] text-text-muted">até</span>
        <input
          type="date"
          value={filtros.data_fim}
          max={today}
          onChange={(e) => setFiltros({ data_fim: e.target.value })}
          className={cn(
            'h-8 px-2 rounded-lg text-[11.5px] w-[130px]',
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
            'ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium',
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
            selected={indSelected}
            onChange={handleIndChangeMobile} loading={isLoading} />
          <MultiSelect label="Material" options={matOpts} selected={filtros.materiais}
            onChange={(ids) => setFiltros({ materiais: ids as number[] })} loading={isLoading} />
          <MultiSelect label="Bloco" options={blocoOpts} selected={filtros.blocos}
            onChange={(ids) => setFiltros({ blocos: ids as number[] })} loading={isLoading} />

          <div className="w-full h-px bg-surface-border my-1" />
          <p className="text-[9px] text-text-muted uppercase tracking-widest">
            Período (faturamento)
          </p>
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

  const {
    filtros,
    drillChapa, drillBloco, drillFat,
    drillIntoChapa, drillOutChapa,
    drillIntoBloco, drillOutBloco,
    drillIntoFat,   drillOutFat,
    resetFiltros,
  } = useEstoqueStore()

  const activeCount =
    filtros.empresas.length + filtros.materiais.length + filtros.blocos.length +
    filtros.espessuras.length + filtros.industrializacao.length + filtros.situacao.length +
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)

  const { data: kpiData,    isLoading: kpiLoading   } = useEstoqueKpi()
  const { data: chapaData,  isLoading: chapaLoading  } = useEstoqueChapa()
  const { data: blocoData,  isLoading: blocoLoading  } = useEstoqueBloco()
  const { data: matrizData, isLoading: matrizLoading } = useEstoqueFaturamentoMatriz()

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">

      {/* ── Filtros (topo, estilo Visão Geral) ────────────── */}
      <ErrorBoundary>
        <div className="hidden sm:block rounded-xl bg-surface border border-surface-border px-4 py-3 card-glow">
          <FiltrosInline />
        </div>
        <div className="sm:hidden h-0 overflow-hidden" aria-hidden="true">
          <FiltrosInline />
        </div>
      </ErrorBoundary>

      {/* ── Cards KPI (topo, em linha) ─────────────────────── */}
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

      {/* ── Tabelas CHAPA + BLOCO ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ErrorBoundary>
          <DrillTable
            title="Chapa / Recortado"
            headers={CHAPA_HEADERS}
            fields={CHAPA_FIELDS}
            data={chapaData}
            loading={chapaLoading}
            drill={drillChapa}
            onDrillInto={drillIntoChapa}
            onDrillOut={drillOutChapa}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <DrillTable
            title="Bloco"
            headers={BLOCO_HEADERS}
            fields={BLOCO_FIELDS}
            data={blocoData}
            loading={blocoLoading}
            drill={drillBloco}
            onDrillInto={drillIntoBloco}
            onDrillOut={drillOutBloco}
          />
        </ErrorBoundary>
      </div>

      {/* ── Matriz faturamento ────────────────────────────── */}
      <ErrorBoundary>
        <EstoqueMatriz
          data={matrizData}
          loading={matrizLoading}
          drill={drillFat}
          onDrillInto={drillIntoFat}
          onDrillOut={drillOutFat}
        />
      </ErrorBoundary>

      {/* ── Drawer mobile ─────────────────────────────────── */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* ── Botão flutuante mobile ────────────────────────── */}
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
