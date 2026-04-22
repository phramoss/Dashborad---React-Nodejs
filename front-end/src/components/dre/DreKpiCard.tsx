import { memo } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { fmtBRL, fmtPct, safe } from './dre-helpers'

export interface DreKpiCardProps {
  title:   string
  value:   number
  pct?:    number
  icon:    React.ElementType
  accent?: string
  loading?: boolean
}

export const DreKpiCard = memo(function DreKpiCard({
  title, value, pct, icon: Icon, accent = 'text-brand', loading,
}: DreKpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg bg-surface border border-surface-border p-3 flex flex-col gap-1.5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-6 w-28" />
        {pct !== undefined && <Skeleton className="h-2.5 w-14" />}
      </div>
    )
  }
  return (
    <div className="rounded-lg bg-surface border border-surface-border p-3 flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[9px] sm:text-[10px] font-medium text-text-muted uppercase tracking-wider truncate leading-tight">
          {title}
        </p>
        <div className={cn('w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0', `${accent.replace('text-', 'bg-')}/15`)}>
          <Icon size={11} className={accent} strokeWidth={1.5} />
        </div>
      </div>
      <p className={cn('font-bold tabular-nums leading-snug text-sm sm:text-lg truncate', accent)}>
        {fmtBRL(safe(value))}
      </p>
      {pct !== undefined && (
        <p className="text-[9px] sm:text-[11px] text-text-muted leading-tight">
          {fmtPct(safe(pct) * 100)} do recebimento
        </p>
      )}
    </div>
  )
})
