import { memo } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { fmtBRL, fmtPct, safe } from './dre-helpers'

export interface DreKpiCardProps {
  title:   string
  value:   number
  pct?:    number
  icon:    React.ElementType
  accent?: string  // kept for backwards compat (no longer applied)
  loading?: boolean
}

export const DreKpiCard = memo(function DreKpiCard({
  title, value, pct, icon: Icon, loading,
}: DreKpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl p-4 card-glow flex flex-col gap-1.5" style={{ background: 'var(--surface-kpi)' }}>
        <Skeleton className="h-2.5 w-20 bg-white/20" />
        <Skeleton className="h-6 w-28 bg-white/25" />
        {pct !== undefined && <Skeleton className="h-2.5 w-14 bg-white/20" />}
      </div>
    )
  }
  return (
    <div className="rounded-xl p-4 card-glow flex flex-col gap-0.5 min-w-0 relative overflow-hidden" style={{ background: 'var(--surface-kpi)' }}>
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[9px] sm:text-[10px] font-medium text-white/70 uppercase tracking-wider truncate leading-tight">
          {title}
        </p>
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0 bg-white/15">
          <Icon size={11} className="text-white/80" strokeWidth={1.5} />
        </div>
      </div>
      <p className="font-bold tabular-nums leading-snug text-sm sm:text-lg truncate text-white">
        {fmtBRL(safe(value))}
      </p>
      {pct !== undefined && (
        <p className="text-[9px] sm:text-[11px] text-white/50 leading-tight">
          {fmtPct(safe(pct) * 100)} do recebimento
        </p>
      )}
    </div>
  )
})
