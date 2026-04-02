import { memo, useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

type KpiFormat = 'currency' | 'number' | 'percent' | 'integer'

interface KpiCardProps {
  title: string
  value: number
  format?: KpiFormat
  variation?: number
  subtitle?: string
  secondaryValue?: number
  secondaryLabel?: string
  loading?: boolean
  accent?: string
  animationDelay?: number
}

// ─── Animated counter hook ────────────────────────────────────
function useCountUp(target: number, duration = 900, delay = 0) {
  const [current, setCurrent] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    let start: number | null = null
    const from = 0

    const delayTimer = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!start) start = timestamp
        const elapsed  = timestamp - start
        const progress = Math.min(elapsed / duration, 1)
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setCurrent(from + (target - from) * eased)
        if (progress < 1) frameRef.current = requestAnimationFrame(step)
      }
      frameRef.current = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(delayTimer)
      cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration, delay])

  return current
}

function formatValue(value: number, format: KpiFormat): string {
  switch (format) {
    case 'currency': return formatCurrency(value, true)
    case 'number':   return formatNumber(value)
    case 'percent':  return formatPercent(value)
    case 'integer':  return Math.round(value).toLocaleString('pt-BR')
  }
}

function VariationBadge({ value }: { value: number }) {
  const isPos  = value > 0
  const isZero = value === 0
  const Icon   = isZero ? Minus : isPos ? TrendingUp : TrendingDown

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border',
      isZero && 'text-text-secondary bg-surface-light border-surface-border',
      isPos  && 'text-status-success bg-status-success/10 border-status-success/20',
      !isPos && !isZero && 'text-status-danger bg-status-danger/10 border-status-danger/20',
    )}>
      <Icon size={9} strokeWidth={2.5} />
      {formatPercent(Math.abs(value))}
    </span>
  )
}

export const KpiCard = memo(function KpiCard({
  title,
  value,
  format = 'currency',
  variation,
  subtitle,
  secondaryValue,
  secondaryLabel,
  loading,
  accent = 'text-brand',
  animationDelay = 0,
}: KpiCardProps) {
  const animated = useCountUp(value, 900, animationDelay)

  if (loading) {
    return (
      <div className="rounded-xl bg-surface border border-surface-border p-4 card-glow">
        <Skeleton className="h-2.5 w-20 mb-3" />
        <Skeleton className="h-7 w-28 mb-2" />
        <Skeleton className="h-2.5 w-14" />
      </div>
    )
  }

  return (
    <Card className="flex flex-col gap-1 group hover:border-brand/20 transition-colors">
      <p className="text-[10px] sm:text-[15px] font-medium text-text-muted uppercase tracking-widest leading-none">
        {title}
      </p>

      <div className="flex items-baseline gap-2 mt-1">
        <span className={cn('font-display font-bold text-1xl sm:text-3xl leading-tight tabular-nums', accent)}>
          {formatValue(animated, format)}
        </span>
        {variation !== undefined && <VariationBadge value={variation} />}
      </div>

      {subtitle && (
        <p className="text-[10px] sm:text-[12px] text-text-muted leading-none">{subtitle}</p>
      )}

      {secondaryValue !== undefined && (
        <div className="flex items-center gap-1 mt-1 pt-1.5 border-t border-surface-border/40">
          <span className="text-[10px] text-text-muted">{secondaryLabel}</span>
          <span className="text-[10px] font-mono font-medium text-text-secondary ml-auto">
            {formatValue(secondaryValue, format)}
          </span>
        </div>
      )}
    </Card>
  )
})
