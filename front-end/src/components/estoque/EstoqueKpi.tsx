import { memo } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

export interface KpiBlockProps {
  title:     string
  value:     string
  subtitle?: string
  icon:      React.ElementType
  accent:    string
  loading?:  boolean
}

export const KpiBlock = memo(function KpiBlock({
  title, value, subtitle, icon: Icon, accent, loading,
}: KpiBlockProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-surface border border-surface-border p-4 card-glow flex-1 flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-3 w-14" />
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-surface border border-surface-border p-4 card-glow flex-1 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest truncate">
          {title}
        </p>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', `${accent}/15`)}>
          <Icon size={14} className={accent} strokeWidth={1.5} />
        </div>
      </div>
      <p className={cn('font-display font-bold tabular-nums leading-tight truncate', 'text-3xl lg:text-4xl', accent)}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[12px] text-text-muted">{subtitle}</p>
      )}
    </div>
  )
})
