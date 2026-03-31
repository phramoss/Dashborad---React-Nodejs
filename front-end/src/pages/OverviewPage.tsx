import { memo } from 'react'
import { FiltroBar } from '@/components/filters/FiltroBar'
import { KpiRow } from '@/components/kpi/KpiRow'
import { FaturamentoPeriodoChart } from '@/components/charts/FaturamentoPeriodoChart'
import { TopClientesChart } from '@/components/charts/TopClientesChart'
import { TopMateriaisChart } from '@/components/charts/TopMateriaisChart'
import { GrupoDonutChart } from '@/components/charts/GrupoDonutChart'
import { VendedoresTable } from '@/components/charts/VendedoresTable'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useKpiSummary } from '@/hooks/useDashboardData'

const KpiSection = memo(function KpiSection() {
  const { data, isLoading } = useKpiSummary()
  // isLoading = só true na primeira carga sem cache
  // isFetching seria true em todo re-fetch — causaria piscar o skeleton
  return <KpiRow data={data} loading={isLoading} />
})

export function OverviewPage() {
  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">

      <ErrorBoundary>
        <div className="rounded-xl bg-surface border border-surface-border px-4 py-3 card-glow">
          <FiltroBar />
        </div>
      </ErrorBoundary>

      <ErrorBoundary>
        <KpiSection />
      </ErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">
        <ErrorBoundary><FaturamentoPeriodoChart /></ErrorBoundary>
        <ErrorBoundary><GrupoDonutChart /></ErrorBoundary>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ErrorBoundary><TopClientesChart /></ErrorBoundary>
        <ErrorBoundary><TopMateriaisChart /></ErrorBoundary>
      </div>

      <ErrorBoundary><VendedoresTable /></ErrorBoundary>

    </div>
  )
}
