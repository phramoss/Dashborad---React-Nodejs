import { memo } from 'react'
import { KpiRow } from '@/components/kpi/KpiRow'
import { FiltroBar } from '@/components/filters/FiltroBar'
import { FaturamentoPeriodoChart } from '@/components/charts/FaturamentoPeriodoChart'
import { TopClientesChart } from '@/components/charts/TopClientesChart'
import { TopMateriaisChart } from '@/components/charts/TopMateriaisChart'
import { GrupoDonutChart } from '@/components/charts/GrupoDonutChart'
import { VendedoresChart } from '@/components/charts/VendedoresChart'
import { MapaCard } from '@/components/charts/MapaCard'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useKpiSummary } from '@/hooks/useDashboardData'
import { useDashboardCombined } from '@/hooks/useDashboardCombined'

const KpiColumn = memo(function KpiColumn() {
  const { data, isLoading } = useKpiSummary()
  return <KpiRow data={data} loading={isLoading} vertical />
})

export function OverviewPage() {
  useDashboardCombined()

  return (
    <div className="flex gap-3 items-start pb-4">

      {/* ── Charts area (left) ─────────────────────────────── */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">

        <FiltroBar />

        {/* Wide period chart — full width */}
        <ErrorBoundary>
          <FaturamentoPeriodoChart />
        </ErrorBoundary>

        {/* Row 2: top clientes + top materiais */}
        <div className="grid grid-cols-3 gap-3">
          <ErrorBoundary><TopClientesChart /></ErrorBoundary>
          <ErrorBoundary><TopMateriaisChart /></ErrorBoundary>
          <ErrorBoundary><GrupoDonutChart /></ErrorBoundary>
        </div>

        {/* Row 3: vendedores + mapa */}
        <div className="grid grid-cols-2 gap-3">
          <ErrorBoundary><VendedoresChart /></ErrorBoundary>
          <ErrorBoundary><MapaCard /></ErrorBoundary>
        </div>

      </div>

      {/* ── KPI column (right) ──────────────────────────────── */}
      <div className="w-[280px] xl:w-[310px] flex-shrink-0 sticky top-0">
        <ErrorBoundary>
          <KpiColumn />
        </ErrorBoundary>
        {/* <div className="mt-3">
        
        </div> */}
      </div>

    </div>
  )
}
