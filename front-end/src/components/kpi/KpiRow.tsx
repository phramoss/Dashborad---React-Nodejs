import { memo } from 'react'
import { KpiCard } from './KpiCard'
import type { KpiSummary } from '@/types'

interface KpiRowProps {
  data?: KpiSummary
  loading?: boolean
}

export const KpiRow = memo(function KpiRow({ data, loading }: KpiRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiCard
        title="Faturamento"
        value={data?.faturamento ?? 0}
        format="currency"
        variation={data?.variacaoFaturamento}
        subtitle="vs. período anterior"
        loading={loading}
        accent="text-brand"
        animationDelay={0}
      />
      <KpiCard
        title="Total M²"
        value={data?.totalM2 ?? 0}
        format="currency"
        subtitle={`Qtd: ${data?.qtdM2 ?? 0} PC`}
        loading={loading}
        accent="text-chart-blue"
        animationDelay={20}
      />
      <KpiCard
        title="Total M³"
        value={data?.totalM3 ?? 0}
        format="number"
        subtitle={`Qtd: ${data?.qtdM3 ?? 0} PC`}
        loading={loading}
        accent="text-chart-purple"
        animationDelay={40}
      />
      <KpiCard
        title="Ticket Médio"
        value={data?.ticketMedio ?? 0}
        format="currency"
        loading={loading}
        accent="text-chart-orange"
        animationDelay={60}
      />
      <KpiCard
        title="Nº Pedidos"
        value={data?.numeroPedidos ?? 0}
        format="integer"
        subtitle={`Ext: ${data?.pedidosExterior ?? 0} | Int: ${data?.pedidosInterno ?? 0}`}
        loading={loading}
        accent="text-chart-pink"
        animationDelay={80}
      />
    </div>
  )
})
