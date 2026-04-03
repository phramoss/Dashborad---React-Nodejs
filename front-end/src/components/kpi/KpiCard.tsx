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
// Anima do VALOR ANTERIOR para o novo valor (não do zero),
// evitando o reset jarring a cada troca de filtro.
function useCountUp(target: number, duration = 700, delay = 0) {
  const [current, setCurrent] = useState(target)
  const frameRef  = useRef<number>(0)
  const fromRef   = useRef<number>(target)
  const firstRun  = useRef(true)

  useEffect(() => {
    // Na primeira montagem, exibe direto sem animação
    if (firstRun.current) {
      firstRun.current = false
      fromRef.current  = target
      setCurrent(target)
      return
    }

    const from = fromRef.current
    // Sem mudança — não anima
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
      // shrink-0 garante que a badge nao vai ser comprimida pelo valor
      'inline-flex items-center gap-0.5 font-semibold px-1 py-0.5 rounded-md border whitespace-nowrap shrink-0',
      'text-[9px] sm:text-[10px]',
      isZero && 'text-text-secondary bg-surface-light border-surface-border',
      isPos  && 'text-status-success bg-status-success/10 border-status-success/20',
      !isPos && !isZero && 'text-status-danger bg-status-danger/10 border-status-danger/20',
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
    <Card className="flex flex-col gap-1 group hover:border-brand/20 transition-colors overflow-hidden">
      {/* Titulo */}
      <p className="text-[9px] sm:text-[11px] font-medium text-text-muted uppercase tracking-widest leading-tight truncate">
        {title}
      </p>

      {/*
        Valor + badge de variacao.
        - overflow-hidden no container: impede que qualquer filho vaze o card.
        - flex-1 + truncate no valor: o numero se comprime antes de vazar.
        - shrink-0 + self-start na badge: a porcentagem nunca e comprimida e
          fica alinhada ao topo (evita desalinhamento com texto grande).
      */}
      <div className="flex items-center gap-1.5 mt-1 min-w-0 overflow-hidden">
        <span
          className={cn(
            'font-display font-bold leading-tight tabular-nums',
            'text-lg sm:text-2xl lg:text-3xl',
            'truncate min-w-0 flex-1',
            accent,
          )}
        >
          {formatValue(animated, format)}
        </span>

        {variation !== undefined && (
          <span className="shrink-0 self-start mt-0.5">
            <VariationBadge value={variation} />
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[9px] sm:text-[12px] text-text-muted leading-none truncate">{subtitle}</p>
      )}

      {secondaryValue !== undefined && (
        <div className="flex items-center gap-1 mt-1 pt-1.5 border-t border-surface-border/40 min-w-0 overflow-hidden">
          <span className="text-[10px] text-text-muted truncate">{secondaryLabel}</span>
          <span className="text-[10px] font-mono font-medium text-text-secondary ml-auto shrink-0">
            {formatValue(secondaryValue, format)}
          </span>
        </div>
      )}
    </Card>
  )
})
