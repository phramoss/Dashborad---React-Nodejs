import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useFinanceiroKpi } from '@/hooks/useFinanceiroData'
import { FinanceiroKpiCard }       from '@/components/financeiro/FinanceiroKpiCard'
import { AReceberChart }           from '@/components/financeiro/AReceberChart'
import { APagarChart }             from '@/components/financeiro/APagarChart'
import { SaldoBancarioTable }      from '@/components/financeiro/SaldoBancarioTable'
import { MovimentoSemanalChart }   from '@/components/financeiro/MovimentoSemanalChart'
import { FluxoCaixaChart }         from '@/components/financeiro/FluxoCaixaChart'
import { FinanceiroFilterDrawer, FinanceiroFilterFab } from '@/components/financeiro/FinanceiroFiltros'

export function FinanceiroPage() {
  const { data: kpi, isLoading: kpiLoading } = useFinanceiroKpi()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 pb-4 max-w-[1800px] mx-auto">

      {/* Título + KPI cards */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">

        </div>
        <div className="flex gap-3 flex-wrap">
          <ErrorBoundary>
            <FinanceiroKpiCard
              title="A Receber"
              subtitle="(em aberto)"
              value={kpi?.aReceber ?? 0}
              tipo="receber"
              loading={kpiLoading}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <FinanceiroKpiCard
              title="A Pagar"
              subtitle="(em aberto)"
              value={kpi?.aPagar ?? 0}
              tipo="pagar"
              loading={kpiLoading}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Linha 2: A Receber + A Pagar + Saldo Bancário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ErrorBoundary><AReceberChart /></ErrorBoundary>
        <ErrorBoundary><APagarChart /></ErrorBoundary>
        <ErrorBoundary><SaldoBancarioTable /></ErrorBoundary>
      </div>

      {/* Linha 3: Movimento Semanal + Fluxo de Caixa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ErrorBoundary><MovimentoSemanalChart /></ErrorBoundary>
        <ErrorBoundary><FluxoCaixaChart /></ErrorBoundary>
      </div>

      {/* FAB + Drawer */}
      <FinanceiroFilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <FinanceiroFilterFab onClick={() => setDrawerOpen(v => !v)} />
    </div>
  )
}
