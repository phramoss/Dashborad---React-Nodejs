import { memo } from 'react'
import { FiltroBar } from '@/components/filters/FiltroBar'
import { KpiRow } from '@/components/kpi/KpiRow'
import { FaturamentoPeriodoChart } from '@/components/charts/FaturamentoPeriodoChart'
import { TopClientesChart } from '@/components/charts/TopClientesChart'
import { TopMateriaisChart } from '@/components/charts/TopMateriaisChart'
import { GrupoDonutChart } from '@/components/charts/GrupoDonutChart'
import { VendedoresChart } from '@/components/charts/VendedoresChart'
import { MapaCard } from '@/components/charts/MapaCard'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useKpiSummary } from '@/hooks/useDashboardData'

const KpiSection = memo(function KpiSection() {
  const { data, isLoading } = useKpiSummary()
  return <KpiRow data={data} loading={isLoading} />
})

export function OverviewPage() {
  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">

      {/*
        ── Filtros ─────────────────────────────────────────────────────────
        Desktop (sm+): card visível no topo com barra inline de filtros.
        Mobile:        card OCULTO — os filtros ficam no drawer lateral
                       que o FiltroBar monta via `position: fixed`.
                       O FiltroBar precisa ser renderizado uma única vez;
                       ele mesmo usa `hidden sm:flex` para esconder a barra
                       desktop e mostra só o botão flutuante no mobile.
        ────────────────────────────────────────────────────────────────── */}
      <ErrorBoundary>
        {/* Card container: visível apenas no desktop */}
        <div className="hidden sm:block rounded-xl bg-surface border border-surface-border px-4 py-3 card-glow">
          <FiltroBar />
        </div>
        {/*
          No mobile o card acima está hidden. O FiltroBar ainda precisa
          estar no DOM para registrar o drawer e o botão flutuante (ambos
          são `position: fixed`, então não afetam o layout).
          O wrapper tem h-0 + overflow-hidden para ocupar exatamente 0px.
        */}
        <div className="sm:hidden h-0 overflow-hidden" aria-hidden="true">
          <FiltroBar />
        </div>
      </ErrorBoundary>

      {/* KPIs */}
      <ErrorBoundary>
        <KpiSection />
      </ErrorBoundary>

      {/* Linha 1: Faturamento no período + Donut de grupo */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">
        <ErrorBoundary><FaturamentoPeriodoChart /></ErrorBoundary>
        <ErrorBoundary><GrupoDonutChart /></ErrorBoundary>
      </div>

      {/* Linha 2: Top Clientes + Top Materiais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ErrorBoundary><TopClientesChart /></ErrorBoundary>
        <ErrorBoundary><TopMateriaisChart /></ErrorBoundary>
      </div>

      {/* Linha 3: Vendedores + Mapa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ErrorBoundary><VendedoresChart /></ErrorBoundary>
        <ErrorBoundary><MapaCard /></ErrorBoundary>
      </div>

    </div>
  )
}
