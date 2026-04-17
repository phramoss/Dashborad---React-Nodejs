import { memo, useEffect, useRef, useState, type ElementType } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
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
  icon?: ElementType
}

function useCountUp(target: number, duration = 700, delay = 0) {
  const [current, setCurrent] = useState(target)
  const frameRef  = useRef<number>(0)
  const fromRef   = useRef<number>(target)
  const firstRun  = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      fromRef.current  = target
      setCurrent(target)
      return
    }

    const from = fromRef.current
    if (from === target) return

    let start: number | null = null
    cancelAnimationFrame(frameRef.current)

    const delayTimer = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!start) start = timestamp
        const elapsed  = timestamp - start
        const progress = Math.min(elapsed / duration, 1)
        const eased    = 1 - Math.pow(1 - progress, 3)
        const value    = from + (target - from) * eased
        setCurrent(value)
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step)
        } else {
          fromRef.current = target
        }
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
      'inline-flex items-center gap-0.5 font-semibold px-1 py-0.5 rounded-md border whitespace-nowrap shrink-0',
      'text-[9px] sm:text-[10px]',
      isZero && 'text-white/60 bg-white/10 border-white/20',
      isPos  && 'text-green-300 bg-green-400/15 border-green-400/25',
      !isPos && !isZero && 'text-red-300 bg-red-400/15 border-red-400/25',
    )}>
      <Icon size={8} strokeWidth={2.5} />
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
  icon: Icon,
}: KpiCardProps) {
  const animated = useCountUp(value, 900, animationDelay)

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
      className="rounded-xl p-6 relative overflow-hidden transition-all duration-150 hover:brightness-110 card-glow"
      style={{ background: 'var(--surface-kpi)' }}
    >
      {Icon && (
        <div className="absolute top-3 right-3 w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
          <Icon size={24} className="text-white/80" strokeWidth={1.5} />
        </div>
      )}

      <p className="text-[14px] font-semibold text-white/70 uppercase tracking-widest leading-tight pr-6">
        {title}
      </p>

      <div className="flex items-end gap-1.5 mt-6 min-w-0 overflow-hidden">
        <span
          className={cn(
            'font-display font-bold leading-tight tabular-nums',
            'text-2xl sm:text-4xl',
            'truncate min-w-0 flex-1',
            accent,
          )}
        >
          {formatValue(animated, format)}
        </span>

        {variation !== undefined && (
          <span className="shrink-0 mb-0.5">
            <VariationBadge value={variation} />
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[14px] text-white/50 leading-none truncate mt-4">{subtitle}</p>
      )}

      {secondaryValue !== undefined && (
        <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-white/10 min-w-0 overflow-hidden">
          <span className="text-[14px] text-white/50 truncate">{secondaryLabel}</span>
          <span className="text-[14px] font-mono font-medium text-white/70 ml-auto shrink-0">
            {formatValue(secondaryValue, format)}
          </span>
        </div>
      )}
    </div>
  )
})
