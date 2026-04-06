import { memo, useMemo, useState, useCallback, useEffect, Fragment } from 'react'
import {
  SlidersHorizontal, RefreshCw, Filter, ChevronRight,
  TrendingDown, Grid3X3, Box, LayoutTemplate,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
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
import type { EstoqueTableRow, EstoqueMatrizRow } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtNum(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(v: number): string {
  return Math.round(v).toLocaleString('pt-BR')
}

function fmtCurrency(v: number): string {
  return formatCurrency(v, true)
}

function sanitize(s: string): string {
  return s.replace(/\?/g, '').trim()
}

// ─── KPI Card vertical (direita) ─────────────────────────────
interface EstoqueKpiCardProps {
  title:     string
  value:     string
  subtitle?: string
  icon:      React.ElementType
  accent:    string
  loading?:  boolean
}

const EstoqueKpiCard = memo(function EstoqueKpiCard({
  title, value, subtitle, icon: Icon, accent, loading,
}: EstoqueKpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-surface border border-surface-border p-4 card-glow flex flex-col gap-2">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-surface border border-surface-border p-4 card-glow flex flex-col gap-1">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest leading-tight">
          {title}
        </p>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', accent + '/20')}>
          <Icon size={14} className={accent} strokeWidth={1.5} />
        </div>
      </div>
      <p className={cn('font-display font-bold text-2xl tabular-nums leading-tight', accent)}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[11px] text-text-muted">{subtitle}</p>
      )}
    </div>
  )
})

// ─── Tabela Chapa/Recortado ou Bloco ─────────────────────────
interface EstoqueTableProps {
  title:    string
  rows?:    EstoqueTableRow[]
  totais?:  { metragem: number; pc: number }
  loading?: boolean
  selectedCodMa: number | null
  onSelectRow:   (codMa: number | null) => void
}

const EstoqueTable = memo(function EstoqueTable({
  title, rows = [], totais, loading, selectedCodMa, onSelectRow,
}: EstoqueTableProps) {
  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-surface-border shrink-0">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          {title}
        </p>
      </div>

      {/* Cabeçalho fixo */}
      <div className="grid grid-cols-[1fr_80px_52px] gap-1 px-3 py-1.5 bg-surface-light border-b border-surface-border shrink-0">
        <span className="text-[10px] text-text-muted uppercase tracking-wider">Material</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider text-right">Metragem</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider text-right">PC</span>
      </div>

      {/* Corpo com scroll */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 280 }}>
        {loading ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[11px] text-text-muted">Sem dados</p>
          </div>
        ) : (
          rows.map((r) => {
            const isSelected = selectedCodMa === r.codMa
            return (
              <button
                key={r.codMa + r.material}
                onClick={() => onSelectRow(isSelected ? null : r.codMa)}
                className={cn(
                  'w-full grid grid-cols-[1fr_80px_52px] gap-1 px-3 py-1 text-left',
                  'transition-colors duration-100',
                  isSelected
                    ? 'bg-brand/15 border-l-2 border-brand'
                    : 'hover:bg-surface-light border-l-2 border-transparent',
                )}
              >
                <span className="text-[11px] text-text-secondary truncate pr-1">
                  {sanitize(r.material)}
                </span>
                <span className="text-[11px] text-text-primary tabular-nums text-right">
                  {fmtNum(r.metragem)}
                </span>
                <span className="text-[11px] text-text-primary tabular-nums text-right">
                  {fmtInt(r.pc)}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Rodapé totais */}
      {!loading && totais && (
        <div className="grid grid-cols-[1fr_80px_52px] gap-1 px-3 py-1.5 bg-surface-light border-t border-surface-border shrink-0">
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

// ─── Matriz Estoque por Faturamento ──────────────────────────
interface EstoqueMatrizProps {
  rows?:    EstoqueMatrizRow[]
  loading?: boolean
}

const EstoqueMatriz = memo(function EstoqueMatriz({ rows = [], loading }: EstoqueMatrizProps) {
  // Pivot: derivar períodos únicos ordenados e materiais
  const { periodos, materiais, pivot, totaisPeriodo, totalGeral } = useMemo(() => {
    if (!rows.length) return { periodos: [], materiais: [], pivot: {}, totaisPeriodo: {}, totalGeral: { quantidade: 0, total: 0 } }

    // Coletar períodos únicos (ano-mes) ordenados
    const periodSet = new Set<string>()
    rows.forEach(r => periodSet.add(`${r.ano}-${String(r.mes).padStart(2, '0')}`))
    const periodos = Array.from(periodSet).sort()

    // Coletar materiais únicos ordenados
    const matSet = new Map<number, string>()
    rows.forEach(r => { if (!matSet.has(r.codMa)) matSet.set(r.codMa, r.material) })
    const materiais = Array.from(matSet.entries()).map(([codMa, material]) => ({ codMa, material }))

    // Construir pivot: { codMa: { 'ano-mes': { quantidade, total } } }
    const pivot: Record<number, Record<string, { quantidade: number; total: number }>> = {}
    const totaisPeriodo: Record<string, { quantidade: number; total: number }> = {}
    let totalGeral = { quantidade: 0, total: 0 }

    rows.forEach(r => {
      const key = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      if (!pivot[r.codMa]) pivot[r.codMa] = {}
      pivot[r.codMa][key] = { quantidade: r.quantidade, total: r.total }

      if (!totaisPeriodo[key]) totaisPeriodo[key] = { quantidade: 0, total: 0 }
      totaisPeriodo[key].quantidade += r.quantidade
      totaisPeriodo[key].total      += r.total

      totalGeral.quantidade += r.quantidade
      totalGeral.total      += r.total
    })

    return { periodos, materiais, pivot, totaisPeriodo, totalGeral }
  }, [rows])

  function periodoLabel(key: string): string {
    const [ano, mes] = key.split('-')
    const nomeMes = MESES_ABREV[Number(mes) - 1] ?? mes
    return `${nomeMes.toLowerCase()} de ${ano}`
  }

  if (loading) {
    return (
      <Card noPadding>
        <div className="px-3 py-2.5 border-b border-surface-border">
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

  if (!rows.length) {
    return (
      <Card noPadding>
        <div className="px-3 py-2.5 border-b border-surface-border">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
            Estoque por Faturamento
          </p>
        </div>
        <div className="flex items-center justify-center h-20">
          <p className="text-[11px] text-text-muted">Sem dados de faturamento no período</p>
        </div>
      </Card>
    )
  }

  // Largura por período: cabeçalho duplo (Quantidade + Total Faturado)
  const COL_MAT = 200  // px para coluna Material
  const COL_VAL = 90   // px para cada sub-coluna de valor

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-surface-border shrink-0">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          Estoque por Faturamento
        </p>
      </div>

      {/* Scroll horizontal */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 360 }}>
        <table className="border-collapse text-[11px]" style={{ minWidth: COL_MAT + periodos.length * COL_VAL * 2 }}>
          <thead className="sticky top-0 z-10 bg-surface-light">
            {/* Linha 1: Mês Ano | período... */}
            <tr>
              <th
                rowSpan={2}
                className="text-left px-3 py-1.5 text-text-muted font-medium border-b border-r border-surface-border"
                style={{ minWidth: COL_MAT, width: COL_MAT }}
              >
                Mês Ano / Material
              </th>
              {periodos.map(p => (
                <th
                  key={p}
                  colSpan={2}
                  className="text-center px-2 py-1.5 text-text-muted font-medium border-b border-r border-surface-border capitalize"
                  style={{ minWidth: COL_VAL * 2 }}
                >
                  {periodoLabel(p)}
                </th>
              ))}
            </tr>
            {/* Linha 2: Quantidade | Total */}
            <tr>
              {periodos.map(p => (
                <Fragment key={p}>
                  <th
                    className="text-right px-2 py-1 text-text-muted font-medium border-b border-surface-border"
                    style={{ minWidth: COL_VAL, width: COL_VAL }}
                  >
                    Quantidade
                  </th>
                  <th
                    className="text-right px-2 py-1 text-text-muted font-medium border-b border-r border-surface-border"
                    style={{ minWidth: COL_VAL, width: COL_VAL }}
                  >
                    Total Faturado
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {materiais.map((m, idx) => (
              <tr
                key={m.codMa}
                className={cn(
                  'border-b border-surface-border/50',
                  idx % 2 === 0 ? 'bg-surface' : 'bg-surface-light/30',
                  'hover:bg-surface-light transition-colors',
                )}
              >
                <td
                  className="px-3 py-1 font-medium text-text-secondary border-r border-surface-border truncate"
                  style={{ maxWidth: COL_MAT }}
                  title={m.material}
                >
                  {sanitize(m.material)}
                </td>
                {periodos.map(p => {
                  const cell = pivot[m.codMa]?.[p]
                  return (
                    <Fragment key={p}>
                      <td className="px-2 py-1 text-right tabular-nums text-text-primary">
                        {cell ? fmtNum(cell.quantidade) : ''}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-text-primary border-r border-surface-border/40">
                        {cell ? fmtNum(cell.total) : ''}
                      </td>
                    </Fragment>
                  )
                })}
              </tr>
            ))}

            {/* Linha de total */}
            <tr className="bg-surface-light border-t-2 border-surface-border font-semibold sticky bottom-0">
              <td className="px-3 py-1.5 text-text-secondary border-r border-surface-border">Total</td>
              {periodos.map(p => {
                const t = totaisPeriodo[p]
                return (
                  <Fragment key={p}>
                    <td className="px-2 py-1.5 text-right tabular-nums text-text-primary">
                      {t ? fmtNum(t.quantidade) : ''}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-text-primary border-r border-surface-border/40">
                      {t ? fmtNum(t.total) : ''}
                    </td>
                  </Fragment>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
})

// ─── Painel de filtros (desktop left / mobile drawer) ─────────
interface FiltroPanelProps {
  onClose?: () => void
  activeCount: number
  onReset: () => void
}

const FiltroPanel = memo(function FiltroPanel({ onClose, activeCount, onReset }: FiltroPanelProps) {
  const { filtros, setFiltros } = useEstoqueStore()
  const { data: opts, isLoading } = useEstoqueFiltrosDisponiveis()

  const empresaOpts = useMemo(
    () => (opts?.empresas ?? []).map(e => ({ id: e, label: `Empresa ${e}` })),
    [opts?.empresas],
  )
  const espOpts = useMemo(
    () => (opts?.espessuras ?? []).map(e => ({ id: e, label: `${e} cm` })),
    [opts?.espessuras],
  )
  const indOpts = useMemo(
    () => (opts?.composicoes ?? []).map(c => ({ id: c, label: c })),
    [opts?.composicoes],
  )
  const matOpts = useMemo(
    () => opts?.materiais ?? [],
    [opts?.materiais],
  )
  const blocoOpts = useMemo(
    () => (opts?.blocos ?? []).map(b => ({ id: b, label: String(b) })),
    [opts?.blocos],
  )

  const today = new Date()
  const maxDate = today.toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-2.5">

      {/* Seção título */}
      <div className="flex items-center gap-1.5 text-text-muted">
        <SlidersHorizontal size={13} />
        <span className="text-[10px] uppercase tracking-widest font-semibold">Filtros</span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-brand/20 text-brand text-[10px] font-bold ml-1">
            {activeCount}
          </span>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all"
          >
            <ChevronRight size={15} />
          </button>
        )}
      </div>

      <div className="w-full h-px bg-surface-border" />

      {/* Empresa */}
      <div>
        <p className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Empresa</p>
        <MultiSelect
          label="Empresa"
          options={empresaOpts}
          selected={filtros.empresas}
          onChange={(ids) => setFiltros({ empresas: ids as number[] })}
          loading={isLoading}
        />
      </div>

      {/* Espessura */}
      <div>
        <p className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Espessura</p>
        <MultiSelect
          label="Espessura"
          options={espOpts}
          selected={filtros.espessuras}
          onChange={(ids) => setFiltros({ espessuras: ids as number[] })}
          loading={isLoading}
        />
      </div>

      {/* Industrialização */}
      <div>
        <p className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Industrialização</p>
        <MultiSelect
          label="Industrialização"
          options={indOpts}
          selected={filtros.industrializacao}
          onChange={(vals) => setFiltros({ industrializacao: vals as string[] })}
          loading={isLoading}
        />
      </div>

      {/* Material */}
      <div>
        <p className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Material</p>
        <MultiSelect
          label="Material"
          options={matOpts}
          selected={filtros.materiais}
          onChange={(ids) => setFiltros({ materiais: ids as number[] })}
          loading={isLoading}
        />
      </div>

      {/* Bloco */}
      <div>
        <p className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Bloco</p>
        <MultiSelect
          label="Bloco"
          options={blocoOpts}
          selected={filtros.blocos}
          onChange={(ids) => setFiltros({ blocos: ids as number[] })}
          loading={isLoading}
        />
      </div>

      <div className="w-full h-px bg-surface-border" />

      {/* Período */}
      <div>
        <p className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Período</p>
        <div className="flex flex-col gap-1.5">
          <input
            type="date"
            value={filtros.data_ini}
            max={maxDate}
            onChange={(e) => setFiltros({ data_ini: e.target.value })}
            className={cn(
              'w-full px-2.5 py-1.5 rounded-lg text-[11px]',
              'bg-surface border border-surface-border text-text-primary',
              'focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20',
              'transition-colors',
            )}
          />
          <input
            type="date"
            value={filtros.data_fim}
            max={maxDate}
            onChange={(e) => setFiltros({ data_fim: e.target.value })}
            className={cn(
              'w-full px-2.5 py-1.5 rounded-lg text-[11px]',
              'bg-surface border border-surface-border text-text-primary',
              'focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20',
              'transition-colors',
            )}
          />
        </div>
      </div>

      {/* Limpar */}
      {activeCount > 0 && (
        <button
          onClick={() => { onReset(); onClose?.() }}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg mt-1',
            'text-[11px] font-medium text-status-danger',
            'bg-status-danger/10 border border-status-danger/20',
            'hover:bg-status-danger/20 active:scale-[0.98] transition-all',
          )}
        >
          <RefreshCw size={11} />
          Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
})

// ─── Drawer mobile ────────────────────────────────────────────
interface MobileDrawerProps {
  open:        boolean
  onClose:     () => void
  activeCount: number
  onReset:     () => void
}

const MobileDrawer = memo(function MobileDrawer({ open, onClose, activeCount, onReset }: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm',
          'transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros de Estoque"
        className={cn(
          'sm:hidden fixed top-0 right-0 h-full z-50',
          'w-[85vw] max-w-[320px]',
          'bg-surface border-l border-surface-border shadow-2xl',
          'overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="p-4">
          <FiltroPanel onClose={onClose} activeCount={activeCount} onReset={onReset} />
        </div>
      </div>
    </>
  )
})

// ─── Contagem de filtros ativos ───────────────────────────────
function countAtivos(f: ReturnType<typeof useEstoqueStore.getState>['filtros']): number {
  return (
    f.empresas.length +
    f.materiais.length +
    f.blocos.length +
    f.espessuras.length +
    f.industrializacao.length +
    f.situacao.length +
    (f.data_ini ? 1 : 0) +
    (f.data_fim ? 1 : 0) +
    (f.materialFiltro !== null ? 1 : 0)
  )
}

// ─── Página principal ─────────────────────────────────────────
export function EstoquePage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { filtros, setMaterialFiltro, resetFiltros } = useEstoqueStore()
  const activeCount = countAtivos(filtros)

  const handleReset  = useCallback(() => resetFiltros(), [resetFiltros])
  const handleSelect = useCallback(
    (codMa: number | null) => setMaterialFiltro(codMa),
    [setMaterialFiltro],
  )

  const { data: kpiData,    isLoading: kpiLoading    } = useEstoqueKpi()
  const { data: chapaData,  isLoading: chapaLoading   } = useEstoqueChapa()
  const { data: blocoData,  isLoading: blocoLoading   } = useEstoqueBloco()
  const { data: matrizData, isLoading: matrizLoading  } = useEstoqueFaturamentoMatriz()

  return (
    <div className="flex flex-col gap-0 max-w-[1800px] mx-auto pb-8">

      {/* Título */}
      <div className="mb-3">
        <h1 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest">
          Estoque — Detalhamento de Estoque
        </h1>
      </div>

      {/* Layout principal: 3 colunas */}
      <div className="flex gap-3 min-h-0">

        {/* ── Filtros esquerda (desktop) ─────────────────── */}
        <aside className="hidden sm:flex flex-col w-[190px] shrink-0">
          <div className="rounded-xl bg-surface border border-surface-border p-3 card-glow sticky top-3">
            <FiltroPanel activeCount={activeCount} onReset={handleReset} />
          </div>
        </aside>

        {/* ── Conteúdo central ──────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">

          {/* Tabelas Chapa + Bloco */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ErrorBoundary>
              <EstoqueTable
                title="Chapa / Recortado"
                rows={chapaData?.rows}
                totais={chapaData?.totais}
                loading={chapaLoading}
                selectedCodMa={filtros.materialFiltro}
                onSelectRow={handleSelect}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <EstoqueTable
                title="Bloco"
                rows={blocoData?.rows}
                totais={blocoData?.totais}
                loading={blocoLoading}
                selectedCodMa={filtros.materialFiltro}
                onSelectRow={handleSelect}
              />
            </ErrorBoundary>
          </div>

          {/* Matriz faturamento */}
          <ErrorBoundary>
            <EstoqueMatriz rows={matrizData} loading={matrizLoading} />
          </ErrorBoundary>
        </div>

        {/* ── Cards KPI direita ──────────────────────────── */}
        <aside className="hidden sm:flex flex-col w-[158px] shrink-0 gap-3">
          <EstoqueKpiCard
            title="Custo Total"
            value={fmtCurrency(kpiData?.custoTotal ?? 0)}
            icon={TrendingDown}
            accent="text-brand"
            loading={kpiLoading}
          />
          <EstoqueKpiCard
            title="Total M²"
            value={formatNumber(kpiData?.totalM2 ?? 0)}
            subtitle={`Qtde: ${formatNumber(kpiData?.qtdM2 ?? 0, 0)}`}
            icon={Grid3X3}
            accent="text-chart-blue"
            loading={kpiLoading}
          />
          <EstoqueKpiCard
            title="Total M³"
            value={fmtNum(kpiData?.totalM3 ?? 0)}
            subtitle={`Qtde: ${fmtInt(kpiData?.qtdM3 ?? 0)}`}
            icon={Box}
            accent="text-chart-purple"
            loading={kpiLoading}
          />
          <EstoqueKpiCard
            title="Cavalete"
            value={String(kpiData?.cavaletes ?? 0)}
            icon={LayoutTemplate}
            accent="text-chart-orange"
            loading={kpiLoading}
          />
        </aside>
      </div>

      {/* ── Cards KPI mobile (abaixo das tabelas) ─────────── */}
      <div className="sm:hidden grid grid-cols-2 gap-2 mt-3">
        <EstoqueKpiCard
          title="Custo Total"
          value={fmtCurrency(kpiData?.custoTotal ?? 0)}
          icon={TrendingDown}
          accent="text-brand"
          loading={kpiLoading}
        />
        <EstoqueKpiCard
          title="Total M²"
          value={formatNumber(kpiData?.totalM2 ?? 0)}
          subtitle={`Qtde: ${formatNumber(kpiData?.qtdM2 ?? 0, 0)}`}
          icon={Grid3X3}
          accent="text-chart-blue"
          loading={kpiLoading}
        />
        <EstoqueKpiCard
          title="Total M³"
          value={fmtNum(kpiData?.totalM3 ?? 0)}
          subtitle={`Qtde: ${fmtInt(kpiData?.qtdM3 ?? 0)}`}
          icon={Box}
          accent="text-chart-purple"
          loading={kpiLoading}
        />
        <EstoqueKpiCard
          title="Cavalete"
          value={String(kpiData?.cavaletes ?? 0)}
          icon={LayoutTemplate}
          accent="text-chart-orange"
          loading={kpiLoading}
        />
      </div>

      {/* ── Drawer mobile de filtros ───────────────────────── */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeCount={activeCount}
        onReset={handleReset}
      />

      {/* ── Botão flutuante mobile ────────────────────────── */}
      <button
        onClick={() => setDrawerOpen(v => !v)}
        className={cn(
          'sm:hidden fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full shadow-2xl',
          'flex items-center justify-center',
          'transition-all duration-200 active:scale-95',
          activeCount > 0
            ? 'bg-brand shadow-brand/30 text-surface-dark'
            : 'bg-surface border border-surface-border/80 text-text-muted hover:border-brand/40 hover:text-brand',
        )}
        aria-label="Abrir filtros de estoque"
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
