import { memo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface FinanceiroKpiCardProps {
  title:    string
  subtitle: string
  value:    number
  tipo:     'receber' | 'pagar'
  loading?: boolean
}

export const FinanceiroKpiCard = memo(function FinanceiroKpiCard({
  title, subtitle, value, tipo, loading,
}: FinanceiroKpiCardProps) {
  const Icon = tipo === 'receber' ? TrendingUp : TrendingDown

  if (loading) {
    return (
      <div className="rounded-xl p-4 card-glow" style={{ background: 'var(--surface-kpi)' }}>
        <Skeleton className="h-2.5 w-20 mb-3 bg-white/20" />
        <Skeleton className="h-7 w-28 mb-2 bg-white/25" />
        <Skeleton className="h-2.5 w-14 bg-white/20" />
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-6 relative overflow-hidden transition-all duration-150 hover:brightness-110 card-glow min-w-3x1"
      style={{ background: 'var(--surface-kpi)' }}
    >
      <div className="absolute top-3 right-3 w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
        <Icon size={24} className="text-white/80" strokeWidth={1.5} />
      </div>

      <p className="text-[14px] font-semibold text-white/70 uppercase tracking-widest leading-tight pr-16">
        {title}
      </p>
      <p className="text-[11px] text-white/50 leading-tight mt-0.5">{subtitle}</p>

      <div className="mt-6">
        <span className="font-bold tabular-nums leading-tight text-2xl sm:text-4xl text-white truncate block">
          {formatCurrency(value, true)}
        </span>
      </div>
    </div>
  )
})
