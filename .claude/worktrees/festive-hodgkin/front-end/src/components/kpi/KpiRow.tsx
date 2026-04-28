import { memo } from 'react'
import { DollarSign, Layers, Package, Tag, ShoppingCart } from 'lucide-react'
import { KpiCard } from './KpiCard'
import type { KpiSummary } from '@/types'

interface KpiRowProps {
  data?: KpiSummary
  loading?: boolean
  vertical?: boolean
}

export const KpiRow = memo(function KpiRow({ data, loading, vertical }: KpiRowProps) {
  const containerClass = vertical
    ? 'flex flex-col gap-4'
    : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'

  return (
    <div className={containerClass}>
      <KpiCard
        title="Faturamento"
        value={data?.faturamento ?? 0}
        format="currency"
        variation={data?.variacaoFaturamento}
        subtitle="vs. período anterior"
        loading={loading}
        accent="text-white"
        animationDelay={0}
        icon={DollarSign}
      />
      <KpiCard
        title="Total M²"
        value={data?.totalM2 ?? 0}
        format="currency"
        subtitle={`Qtd: ${data?.qtdM2 ?? 0} PC`}
        loading={loading}
        accent="text-white"
        animationDelay={20}
        icon={Layers}
      />
      <KpiCard
        title="Total M³"
        value={data?.totalM3 ?? 0}
        format="number"
        subtitle={`Qtd: ${data?.qtdM3 ?? 0} PC`}
        loading={loading}
        accent="text-white"
        animationDelay={40}
        icon={Package}
      />
      <KpiCard
        title="Ticket Médio"
        value={data?.ticketMedio ?? 0}
        format="currency"
        loading={loading}
        accent="text-white"
        animationDelay={60}
        icon={Tag}
      />
      <KpiCard
        title="Nº Pedidos"
        value={data?.numeroPedidos ?? 0}
        format="integer"
        subtitle={`Ext: ${data?.pedidosExterior ?? 0} | Int: ${data?.pedidosInterno ?? 0}`}
        loading={loading}
        accent="text-white"
        animationDelay={80}
        icon={ShoppingCart}
      />
    </div>
  )
})
