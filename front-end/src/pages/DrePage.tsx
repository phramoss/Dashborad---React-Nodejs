import { memo, useMemo, useState, useCallback, useEffect } from 'react'
import {
  SlidersHorizontal, RefreshCw, Filter, ChevronRight, ChevronDown,
  TrendingUp, BarChart2, DollarSign, Percent,
  Activity, ArrowLeftRight,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import { useDreStore } from '@/store/dre.store'
import { useDreData } from '@/hooks/useDreData'
import type { DreLinha, DreContaRow, DreClienteRow, DreModo } from '@/types'

// ─── formatters ──────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtPct = (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

const safe = (n: number | null | undefined) =>
  (n === null || n === undefined || !isFinite(n) || isNaN(n)) ? 0 : n

function periodoLabel(p: number): string {
  const year  = Math.floor(p / 100)
  const month = p % 100
  const m = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][month - 1] ?? '?'
  return `${m}/${String(year).slice(-2)}`
}

// ─── Row accent by tipo ───────────────────────────────────────────────────────
function rowStyle(linha: DreLinha, val: number) {
  const { tipo, cod } = linha
  if (tipo === 'A') {
    if (cod === 1) return { row: 'bg-brand/5', val: 'text-brand font-semibold' }
    return { row: '', val: 'text-text-primary' }
  }
  if (tipo === 'ST' || tipo === 'DT') {
    const accent = val >= 0 ? 'text-status-success' : 'text-status-danger'
    const bg     = cod === 14 ? 'bg-status-success/5' : cod === 11 ? 'bg-brand/5' : 'bg-surface-light/30'
    return { row: bg, val: `${accent} font-bold` }
  }
  if (tipo === 'M' || tipo === 'E' || tipo === 'I' || tipo === 'R' || tipo === 'L') {
    return { row: 'bg-surface-light/10', val: 'text-chart-purple font-medium' }
  }
  return { row: '', val: 'text-text-primary' }
}

// ─── KPI mini-card ────────────────────────────────────────────────────────────
const DreKpiCard = memo(function DreKpiCard({
  title, value, pct, icon: Icon, accent = 'text-brand', loading,
}: {
  title: string; value: number; pct?: number; icon: React.ElementType
  accent?: string; loading?: boolean
}) {
  if (loading) {
    return (
      <div className="rounded-lg bg-surface border border-surface-border p-3 flex flex-col gap-1.5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-6 w-28" />
        {pct !== undefined && <Skeleton className="h-2.5 w-14" />}
      </div>
    )
  }
  return (
    <div className={cn(
      'rounded-lg bg-surface border border-surface-border p-3 flex flex-col gap-0.5 min-w-0',
    )}>
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[9px] sm:text-[10px] font-medium text-text-muted uppercase tracking-wider truncate leading-tight">
          {title}
        </p>
        <div className={cn('w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0', `${accent.replace('text-', 'bg-')}/15`)}>
          <Icon size={11} className={accent} strokeWidth={1.5} />
        </div>
      </div>
      <p className={cn('font-bold tabular-nums leading-snug text-sm sm:text-lg truncate', accent)}>
        {fmtBRL(safe(value))}
      </p>
      {pct !== undefined && (
        <p className="text-[9px] sm:text-[11px] text-text-muted leading-tight">
          {fmtPct(safe(pct) * 100)} do recebimento
        </p>
      )}
    </div>
  )
})

// ─── DRE table cells ──────────────────────────────────────────────────────────
const TD_BASE = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right whitespace-nowrap'
const TD_LEFT = 'px-2.5 py-1.5 text-[11px] text-left whitespace-nowrap'

const MIN_LABEL_W = 220
const MIN_COL_W   = 100
const MIN_TOT_W   = 110

// ─── Client row ───────────────────────────────────────────────────────────────
const DreClientRow = memo(function DreClientRow({
  row, periodos,
}: { row: DreClienteRow; periodos: number[] }) {
  return (
    <tr className="border-b border-surface-border/10 hover:bg-surface-light/10 transition-colors">
      <td
        className={cn(TD_LEFT, 'pl-16 sticky left-0 bg-surface text-text-muted/60 text-[10px] z-[3]')}
        style={{ minWidth: MIN_LABEL_W }}
      >
        <div className="flex items-center gap-1">
          <span className="text-text-muted/20 text-[9px] shrink-0">└─</span>
          <span className="truncate max-w-[160px]">{row.cliente}</span>
        </div>
      </td>
      {row.valores.map((v, i) => (
        <td key={periodos[i]} className={cn(TD_BASE, 'text-text-muted/70 text-[10px]')} style={{ minWidth: MIN_COL_W }}>
          {v !== 0 ? fmtBRL(v) : '—'}
        </td>
      ))}
      <td className={cn(TD_BASE, 'text-text-muted/70 text-[10px] font-medium')} style={{ minWidth: MIN_TOT_W }}>
        {fmtBRL(row.total)}
      </td>
    </tr>
  )
})

// ─── Conta row ────────────────────────────────────────────────────────────────
interface ContaRowProps {
  row:         DreContaRow
  codLinha:    number
  periodos:    number[]
  isExpanded:  boolean
  onToggle:    (key: string) => void
}

const DreContaRowComp = memo(function DreContaRowComp({
  row, codLinha, periodos, isExpanded, onToggle,
}: ContaRowProps) {
  const key = `${codLinha}-${row.contab}`
  return (
    <>
      <tr
        className="border-b border-surface-border/15 cursor-pointer hover:bg-surface-light/20 transition-colors select-none"
        onClick={() => onToggle(key)}
      >
        <td
          className={cn(TD_LEFT, 'pl-10 sticky left-0 bg-surface z-[3]')}
          style={{ minWidth: MIN_LABEL_W }}
        >
          <div className="flex items-center gap-1.5">
            <button className="shrink-0 text-text-muted/40 hover:text-text-muted transition-colors">
              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
            <span className="text-text-muted/30 text-[9px] shrink-0">└</span>
            <span className="text-text-muted text-[10px] truncate max-w-[160px]">{row.descricao}</span>
            <span className="text-[8px] text-text-muted/40 shrink-0 font-mono">{row.contab}</span>
          </div>
        </td>
        {row.valores.map((v, i) => (
          <td key={periodos[i]} className={cn(TD_BASE, 'text-text-muted text-[10px]')} style={{ minWidth: MIN_COL_W }}>
            {v !== 0 ? fmtBRL(v) : '—'}
          </td>
        ))}
        <td className={cn(TD_BASE, 'text-text-muted text-[10px] font-medium')} style={{ minWidth: MIN_TOT_W }}>
          {fmtBRL(row.total)}
        </td>
      </tr>
      {isExpanded && row.clientes.map((cli) => (
        <DreClientRow key={cli.cliente} row={cli} periodos={periodos} />
      ))}
    </>
  )
})

// ─── Main DRE linha row ───────────────────────────────────────────────────────
interface LinhaRowProps {
  linha:           DreLinha
  periodos:        number[]
  isExpanded:      boolean
  expandedContas:  Set<string>
  onToggleLinha:   (cod: number) => void
  onToggleConta:   (key: string) => void
}

const DreLinhRow = memo(function DreLinhRow({
  linha, periodos, isExpanded, expandedContas, onToggleLinha, onToggleConta,
}: LinhaRowProps) {
  const { total, tipo, contas, prefixo, descricao, ehPercentual, cod } = linha
  const style = rowStyle(linha, total)
  const hasContas = contas.length > 0

  // Is this a "separator" row with no expand (ST, %)
  const isSeparator = tipo !== 'A'

  const isHighlighted = cod === 4 || cod === 6 || cod === 11 || cod === 14

  return (
    <>
      <tr
        className={cn(
          'border-b border-surface-border/30 select-none transition-colors',
          hasContas && 'cursor-pointer hover:bg-surface-light/30',
          style.row,
          isSeparator && 'border-t border-surface-border/60',
        )}
        onClick={() => hasContas && onToggleLinha(cod)}
      >
        <td
          className={cn(
            TD_LEFT,
            'sticky left-0 z-[3] font-medium',
            style.row || 'bg-surface',
            isHighlighted ? 'bg-inherit' : '',
          )}
          style={{ minWidth: MIN_LABEL_W }}
        >
          <div className="flex items-center gap-1.5">
            {hasContas ? (
              <button className="shrink-0 text-text-muted/50 hover:text-text-muted transition-colors">
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            ) : (
              <span className="w-[19px] shrink-0" />
            )}
            <span className={cn(
              'text-[10px] font-mono shrink-0',
              tipo === 'A'  ? 'text-text-muted/60' :
              tipo === 'ST' || tipo === 'DT' ? (total >= 0 ? 'text-status-success/70' : 'text-status-danger/70') :
              'text-chart-purple/60',
            )}>
              {prefixo}
            </span>
            <span className={cn(
              'text-[11px]',
              tipo === 'A'  ? 'text-text-primary' :
              tipo === 'ST' || tipo === 'DT' ? (total >= 0 ? 'text-status-success' : 'text-status-danger') :
              'text-chart-purple',
              isHighlighted && 'font-semibold',
            )}>
              {descricao}
            </span>
          </div>
        </td>
        {linha.valores.map((v, i) => (
          <td
            key={periodos[i]}
            className={cn(TD_BASE, style.val, 'text-[11px]')}
            style={{ minWidth: MIN_COL_W }}
          >
            {ehPercentual ? fmtPct(safe(v)) : (v !== 0 ? fmtBRL(v) : '—')}
          </td>
        ))}
        <td
          className={cn(TD_BASE, style.val, 'text-[11px] border-l border-surface-border/30')}
          style={{ minWidth: MIN_TOT_W }}
        >
          {ehPercentual ? fmtPct(safe(total)) : fmtBRL(safe(total))}
        </td>
      </tr>
      {isExpanded && contas.map((conta) => (
        <DreContaRowComp
          key={`${cod}-${conta.contab}`}
          row={conta}
          codLinha={cod}
          periodos={periodos}
          isExpanded={expandedContas.has(`${cod}-${conta.contab}`)}
          onToggle={onToggleConta}
        />
      ))}
    </>
  )
})

// ─── DRE Matrix ───────────────────────────────────────────────────────────────
interface DreMatrizProps {
  linhas:   DreLinha[]
  periodos: number[]
  loading:  boolean
}

const DreMatriz = memo(function DreMatriz({ linhas, periodos, loading }: DreMatrizProps) {
  const [expandedLinhas, setExpandedLinhas] = useState<Set<number>>(new Set())
  const [expandedContas, setExpandedContas] = useState<Set<string>>(new Set())

  const toggleLinha = useCallback((cod: number) => {
    setExpandedLinhas(prev => {
      const next = new Set(prev)
      next.has(cod) ? next.delete(cod) : next.add(cod)
      return next
    })
  }, [])

  const toggleConta = useCallback((key: string) => {
    setExpandedContas(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-1 p-3">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    )
  }

  if (!linhas.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <BarChart2 size={28} className="text-text-muted/30" />
        <p className="text-sm text-text-muted">Nenhum dado encontrado</p>
        <p className="text-xs text-text-muted/60">Ajuste o período ou verifique os dados</p>
      </div>
    )
  }

  const thBase = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap text-right'

  return (
    <div className="overflow-x-auto">
      <table className="min-w-max w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface-light">
          <tr className="border-b border-surface-border">
            <th
              className={cn(thBase, 'text-left sticky left-0 z-20 bg-surface-light')}
              style={{ minWidth: MIN_LABEL_W }}
            >
              DRE
            </th>
            {periodos.map(p => (
              <th key={p} className={thBase} style={{ minWidth: MIN_COL_W }}>
                {periodoLabel(p)}
              </th>
            ))}
            <th
              className={cn(thBase, 'border-l border-surface-border/30 text-brand')}
              style={{ minWidth: MIN_TOT_W }}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(linha => (
            <DreLinhRow
              key={linha.cod}
              linha={linha}
              periodos={periodos}
              isExpanded={expandedLinhas.has(linha.cod)}
              expandedContas={expandedContas}
              onToggleLinha={toggleLinha}
              onToggleConta={toggleConta}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
})

// ─── Filters inline (desktop) ────────────────────────────────────────────────
interface DreFiltersProps {
  filtros:      { modo: DreModo; data_ini: string; data_fim: string }
  setModo:      (m: DreModo) => void
  setDataIni:   (d: string) => void
  setDataFim:   (d: string) => void
  resetFiltros: () => void
}

const DreFiltersInline = memo(function DreFiltersInline({
  filtros, setModo, setDataIni, setDataFim, resetFiltros,
}: DreFiltersProps) {
  const currentYear = new Date().getFullYear()
  const isDefault = filtros.data_ini === `${currentYear}-01-01` &&
                    filtros.data_fim === `${currentYear}-12-31` &&
                    filtros.modo === 'caixa'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-text-muted mr-1">
        <SlidersHorizontal size={14} />
        <span className="text-[11.5px] uppercase tracking-widest font-medium">Filtros</span>
      </div>

      <div className="w-px h-5 bg-surface-border" />

      {/* Modo toggle */}
      <div className="flex rounded-lg overflow-hidden border border-surface-border h-8">
        <button
          onClick={() => setModo('caixa')}
          className={cn(
            'px-3 text-[11px] font-medium transition-all',
            filtros.modo === 'caixa'
              ? 'bg-brand/15 text-brand border-r border-brand/20'
              : 'text-text-muted hover:text-text-primary bg-surface-light border-r border-surface-border',
          )}
        >
          Caixa
        </button>
        <button
          onClick={() => setModo('competencia')}
          className={cn(
            'px-3 text-[11px] font-medium transition-all',
            filtros.modo === 'competencia'
              ? 'bg-brand/15 text-brand'
              : 'text-text-muted hover:text-text-primary bg-surface-light',
          )}
        >
          Competência
        </button>
      </div>

      <div className="w-px h-5 bg-surface-border" />

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-text-muted">De</span>
        <input
          type="date"
          value={filtros.data_ini}
          onChange={e => setDataIni(e.target.value)}
          className={cn(
            'h-8 px-2 rounded-lg border border-surface-border bg-surface-light text-[11px] text-text-primary',
            'focus:outline-none focus:border-brand/50 transition-colors',
          )}
        />
        <span className="text-[11px] text-text-muted">até</span>
        <input
          type="date"
          value={filtros.data_fim}
          onChange={e => setDataFim(e.target.value)}
          className={cn(
            'h-8 px-2 rounded-lg border border-surface-border bg-surface-light text-[11px] text-text-primary',
            'focus:outline-none focus:border-brand/50 transition-colors',
          )}
        />
      </div>

      {!isDefault && (
        <button
          onClick={resetFiltros}
          className={cn(
            'ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium',
            'text-status-danger/80 hover:text-status-danger',
            'bg-status-danger/5 hover:bg-status-danger/10',
            'border border-status-danger/20 hover:border-status-danger/40',
            'transition-all duration-150',
          )}
        >
          <RefreshCw size={11} />
          Restaurar
        </button>
      )}
    </div>
  )
})

// ─── Mobile drawer ────────────────────────────────────────────────────────────
interface MobileDrawerProps extends DreFiltersProps {
  open:    boolean
  onClose: () => void
}

const DreMobileDrawer = memo(function DreMobileDrawer({
  open, onClose, filtros, setModo, setDataIni, setDataFim, resetFiltros,
}: MobileDrawerProps) {
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
            <span className="text-[12px] uppercase tracking-widest font-semibold">Filtros DRE</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Modo */}
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2">Modo</p>
            <div className="flex rounded-lg overflow-hidden border border-surface-border">
              <button
                onClick={() => setModo('caixa')}
                className={cn(
                  'flex-1 py-2.5 text-[12px] font-medium transition-all border-r border-surface-border',
                  filtros.modo === 'caixa' ? 'bg-brand/15 text-brand' : 'text-text-muted bg-surface-light',
                )}
              >
                Caixa
              </button>
              <button
                onClick={() => setModo('competencia')}
                className={cn(
                  'flex-1 py-2.5 text-[12px] font-medium transition-all',
                  filtros.modo === 'competencia' ? 'bg-brand/15 text-brand' : 'text-text-muted bg-surface-light',
                )}
              >
                Competência
              </button>
            </div>
          </div>

          {/* Período */}
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2">Período</p>
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-[10px] text-text-muted mb-1">De</p>
                <input
                  type="date"
                  value={filtros.data_ini}
                  onChange={e => setDataIni(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-surface-border bg-surface-light text-[12px] text-text-primary focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <p className="text-[10px] text-text-muted mb-1">Até</p>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={e => setDataFim(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-surface-border bg-surface-light text-[12px] text-text-primary focus:outline-none focus:border-brand/50"
                />
              </div>
            </div>
          </div>
          <div className="h-20" />
        </div>

        <div className="sticky bottom-0 z-10 px-4 py-4 bg-surface border-t border-surface-border flex flex-col gap-2">
          <button
            onClick={() => { resetFiltros(); onClose() }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-status-danger bg-status-danger/10 border border-status-danger/20 hover:bg-status-danger/20 transition-all"
          >
            <RefreshCw size={12} /> Restaurar padrão
          </button>
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export function DrePage() {
  const { filtros, setModo, setDataIni, setDataFim, resetFiltros } = useDreStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading } = useDreData()

  const linhas  = useMemo(() => data?.linhas  ?? [], [data?.linhas])
  const periodos = useMemo(() => data?.periodos ?? [], [data?.periodos])
  const kpi     = data?.kpi

  const filtersProps: DreFiltersProps = { filtros, setModo, setDataIni, setDataFim, resetFiltros }

  const modoLabel = filtros.modo === 'caixa' ? 'Caixa' : 'Competência'

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">

      {/* Filtros desktop */}
      <div className="hidden sm:block">
        <DreFiltersInline {...filtersProps} />
      </div>

      {/* Header de modo (mobile) */}
      <div className="sm:hidden flex items-center gap-2">
        <ArrowLeftRight size={14} className="text-brand" />
        <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-widest">
          DRE — {modoLabel}
        </span>
      </div>

      {/* KPI cards */}
      <ErrorBoundary>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <DreKpiCard
            title="Recebimento"
            value={safe(kpi?.recebimento)}
            icon={DollarSign}
            accent="text-brand"
            loading={isLoading}
          />
          <DreKpiCard
            title="Lucro Bruto"
            value={safe(kpi?.lucro_bruto)}
            pct={kpi?.lucro_bruto_pct}
            icon={TrendingUp}
            accent={kpi && kpi.lucro_bruto >= 0 ? 'text-status-success' : 'text-status-danger'}
            loading={isLoading}
          />
          <DreKpiCard
            title="EBTIDA"
            value={safe(kpi?.ebtida)}
            pct={kpi?.ebtida_pct}
            icon={Activity}
            accent={kpi && kpi.ebtida >= 0 ? 'text-status-success' : 'text-status-danger'}
            loading={isLoading}
          />
          <DreKpiCard
            title="Resultado"
            value={safe(kpi?.resultado)}
            pct={kpi?.resultado_pct}
            icon={BarChart2}
            accent={kpi && kpi.resultado >= 0 ? 'text-status-success' : 'text-status-danger'}
            loading={isLoading}
          />
          <DreKpiCard
            title="Lucro Líquido"
            value={safe(kpi?.lucro_liquido)}
            pct={kpi?.lucro_liquido_pct}
            icon={Percent}
            accent={kpi && kpi.lucro_liquido >= 0 ? 'text-status-success' : 'text-status-danger'}
            loading={isLoading}
          />
        </div>
      </ErrorBoundary>

      {/* Modo badge desktop */}
      <div className="hidden sm:flex items-center gap-2">
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border',
          filtros.modo === 'caixa'
            ? 'bg-chart-blue/10 text-chart-blue border-chart-blue/20'
            : 'bg-chart-purple/10 text-chart-purple border-chart-purple/20',
        )}>
          <ArrowLeftRight size={10} />
          {modoLabel}
        </div>
        {periodos.length > 0 && (
          <span className="text-[10px] text-text-muted">
            {periodoLabel(periodos[0])} — {periodoLabel(periodos[periodos.length - 1])}
            <span className="ml-1 text-text-muted/50">({periodos.length} período{periodos.length !== 1 ? 's' : ''})</span>
          </span>
        )}
      </div>

      {/* DRE Matrix */}
      <ErrorBoundary>
        <Card noPadding>
          <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2 flex-wrap gap-y-1">
            <BarChart2 size={12} className="text-brand" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
              DRE — Demonstrativo de Resultado
            </h2>
            <span className={cn(
              'ml-2 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border',
              filtros.modo === 'caixa'
                ? 'bg-chart-blue/10 text-chart-blue border-chart-blue/20'
                : 'bg-chart-purple/10 text-chart-purple border-chart-purple/20',
            )}>
              {modoLabel}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <DreMatriz
              linhas={linhas}
              periodos={periodos}
              loading={isLoading}
            />
          </div>
        </Card>
      </ErrorBoundary>

      {/* Mobile drawer */}
      <DreMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        {...filtersProps}
      />

      {/* FAB mobile */}
      <button
        onClick={() => setDrawerOpen(v => !v)}
        className={cn(
          'sm:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl',
          'flex items-center justify-center transition-all duration-200 active:scale-95',
          'bg-surface border border-surface-border/80 text-text-muted hover:border-brand/40 hover:text-brand',
        )}
        aria-label="Abrir filtros DRE"
      >
        <Filter size={22} />
      </button>
    </div>
  )
}
