import { memo } from 'react'
import { Percent } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

export function CardSkeleton() {
  return (
    <div className="rounded-lg bg-surface border border-surface-border p-3 flex flex-col gap-1.5">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-2.5 w-14" />
    </div>
  )
}

export interface InfoCardProps {
  title:     string
  value:     string
  subtitle?: string
  icon:      React.ElementType
  accent?:   string
  loading?:  boolean
  highlight?: boolean
}

export const InfoCard = memo(function InfoCard({
  title, value, subtitle, icon: Icon, accent = 'text-brand', loading, highlight,
}: InfoCardProps) {
  if (loading) return <CardSkeleton />
  return (
    <div className={cn(
      'rounded-lg "#428D94" border  p-3 flex flex-col gap-0.5 min-w-0 h-full',
      highlight && 'border-brand/30 bg-brand/5',
    )}>
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[8px] sm:text-[10px] font-medium text-text-muted uppercase tracking-wider truncate leading-tight">
          {title}
        </p>
        <div className={cn('w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0', `${accent.replace('text-', 'bg-')}/15`)}>
          <Icon size={11} className={accent} strokeWidth={1.5} />
        </div>
      </div>
      <p className={cn('font-bold tabular-nums leading-snug text-base sm:text-xl truncate', accent)}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[8px] sm:text-[10px] text-text-muted leading-tight">{subtitle}</p>
      )}
    </div>
  )
})

export interface LucroSliderProps {
  value:     number
  onChange:  (v: number) => void
  disabled?: boolean
  label?:    string
}

export const LucroSlider = memo(function LucroSlider({ value, onChange, disabled, label }: LucroSliderProps) {
  const pct = +(value * 100).toFixed(2)

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Math.max(Number(e.target.value), 0), 100)
    onChange(v / 100)
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.')
    const v   = parseFloat(raw)
    if (!isNaN(v)) onChange(Math.min(Math.max(v, 0), 100) / 100)
  }

  return (
    <div className="rounded-lg '#428D94' border '#428D94' p-3 flex flex-col gap-1 min-w-0 h-full">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
          {label ?? '% DE LUCRO'}
        </p>
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-chart-orange/15">
          <Percent size={12} className="text-chart-orange" strokeWidth={1.5} />
        </div>
      </div>
      <div className="flex justify-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={pct}
          onChange={handleInput}
          disabled={disabled}
          className={cn(
            'w-14 bg-surface-light border border-surface-border rounded-md px-1.5 py-0.5',
            'text-sm font-semibold tabular-nums text-white text-right',
            'focus:outline-none focus:border-brand/50',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
        <span className="text-sm font-semibold text-white">%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={0.01}
        value={pct}
        onChange={handleSlider}
        disabled={disabled}
        className={cn(
          'w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        style={{
          background: `linear-gradient(to right, var(--color-brand, #00d4aa) ${pct}%, #2d3554 ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-[8px] text-text-muted">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
    </div>
  )
})
