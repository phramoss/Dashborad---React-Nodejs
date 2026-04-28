import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--surface-light)]',
        className,
      )}
    />
  )
}

export function SkeletonCard({ lines = 3 }: SkeletonProps) {
  return (
    <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 card-glow">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-8 w-36 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3 mb-2', i === lines - 1 ? 'w-1/2' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 card-glow', className)}>
      <Skeleton className="h-3 w-32 mb-4" />
      <div className="flex items-end gap-2 h-40">
        {[60, 85, 45, 70, 95, 50, 75, 65].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}
