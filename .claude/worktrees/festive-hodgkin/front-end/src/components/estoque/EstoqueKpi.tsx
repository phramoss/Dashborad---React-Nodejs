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
      <div className="rounded-xl p-4 card-glow flex-1 flex flex-col gap-2" style={{ background: 'var(--surface-kpi)' }}>
        <Skeleton className="h-3 w-20 bg-white/20" />
        <Skeleton className="h-9 w-32 bg-white/25" />
        <Skeleton className="h-3 w-14 bg-white/20" />
      </div>
    )
  }
  return (
    <div className="rounded-xl p-4 card-glow flex-1 flex flex-col gap-1 min-w-0 relative overflow-hidden" style={{ background: 'var(--surface-kpi)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-white/70 uppercase tracking-widest truncate">
          {title}
        </p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/15">
          <Icon size={14} className="text-white/80" strokeWidth={1.5} />
        </div>
      </div>
      <p className="font-display font-bold tabular-nums leading-tight truncate text-3xl lg:text-4xl text-white">
        {value}
      </p>
      {subtitle && (
        <p className="text-[12px] text-white/50">{subtitle}</p>
      )}
    </div>
  )
})
