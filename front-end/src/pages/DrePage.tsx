import { useMemo, useState } from 'react'
import { BarChart2, Filter, ArrowLeftRight, TrendingUp, DollarSign, Percent, Activity } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import { useDreStore } from '@/store/dre.store'
import { useDreData } from '@/hooks/useDreData'

import { DreKpiCard } from '@/components/dre/DreKpiCard'
import { DreMatriz } from '@/components/dre/DreMatriz'
import { DreFiltersInline, DreMobileDrawer } from '@/components/dre/DreFiltros'
import { safe, periodoLabel } from '@/components/dre/dre-helpers'
import type { DreFiltersProps } from '@/components/dre/DreFiltros'

export function DrePage() {
  const { filtros, setModo, setDataIni, setDataFim, resetFiltros } = useDreStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading, isError } = useDreData()

  const linhas   = useMemo(() => data?.linhas  ?? [], [data?.linhas])
  const periodos = useMemo(() => data?.periodos ?? [], [data?.periodos])
  const kpi      = data?.kpi

  const filtersProps: DreFiltersProps = { filtros, setModo, setDataIni, setDataFim, resetFiltros }
  const modoLabel = filtros.modo === 'caixa' ? 'Caixa' : 'Competência'

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">

      <div className="hidden sm:block">
        <DreFiltersInline {...filtersProps} />
      </div>

      <div className="sm:hidden flex items-center gap-2">
        <ArrowLeftRight size={14} className="text-brand" />
        <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-widest">
          DRE — {modoLabel}
        </span>
      </div>

      <ErrorBoundary>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <DreKpiCard title="Recebimento" value={safe(kpi?.recebimento)}
            icon={DollarSign} accent="text-brand" loading={isLoading} />
          <DreKpiCard title="Lucro Bruto" value={safe(kpi?.lucro_bruto)} pct={kpi?.lucro_bruto_pct}
            icon={TrendingUp} accent={kpi && kpi.lucro_bruto >= 0 ? 'text-status-success' : 'text-status-danger'} loading={isLoading} />
          <DreKpiCard title="EBTIDA" value={safe(kpi?.ebtida)} pct={kpi?.ebtida_pct}
            icon={Activity} accent={kpi && kpi.ebtida >= 0 ? 'text-status-success' : 'text-status-danger'} loading={isLoading} />
          <DreKpiCard title="Resultado" value={safe(kpi?.resultado)} pct={kpi?.resultado_pct}
            icon={BarChart2} accent={kpi && kpi.resultado >= 0 ? 'text-status-success' : 'text-status-danger'} loading={isLoading} />
          <DreKpiCard title="Lucro Líquido" value={safe(kpi?.lucro_liquido)} pct={kpi?.lucro_liquido_pct}
            icon={Percent} accent={kpi && kpi.lucro_liquido >= 0 ? 'text-status-success' : 'text-status-danger'} loading={isLoading} />
        </div>
      </ErrorBoundary>

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
          {isError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <BarChart2 size={28} className="text-status-danger/30" />
              <p className="text-sm text-status-danger">Erro ao carregar dados</p>
              <p className="text-xs text-text-muted/60">Verifique a conexão com o servidor</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <DreMatriz linhas={linhas} periodos={periodos} loading={isLoading} />
            </div>
          )}
        </Card>
      </ErrorBoundary>

      <DreMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} {...filtersProps} />

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
