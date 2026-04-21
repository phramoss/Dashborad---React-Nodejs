import { memo, useCallback, useRef, useEffect, useState, type ElementType } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { Card } from '@/components/ui/Card'
import { SkeletonChart } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/lib/utils'

export const CHART_COLORS = {
  teal:   '#428D94',
  red:    '#A70000',
  purple: '#AA3E98',
  blue:   '#4A90D9',
  orange: '#F5A623',
  pink:   '#E056A0',
  yellow: '#F7DC6F',
  gray:   '#666666',
} as const

export function getChartTheme(theme: 'dark' | 'light') {
  return {
    textColor:     theme === 'dark' ? '#cdcdce' : '#000000',
    axisColor:     theme === 'dark' ? 'rgba(66,141,148,0.20)' : 'rgba(0,0,0,0.15)',
    gridLineColor: theme === 'dark' ? 'rgba(66,141,148,0.08)' : 'rgba(0,0,0,0.06)',
    tooltipBg:     '#111111',
    tooltipBorder: '#333333',
  }
}

export const CHART_THEME = {
  get textColor()     { return getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#cdcdce' },
  get axisColor()     { return getComputedStyle(document.documentElement).getPropertyValue('--chart-axis').trim() || 'rgba(66,141,148,0.20)' },
  get tooltipBg()     { return '#111111' },
  get tooltipBorder() { return '#333333' },
  get gridLineColor() { return getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim() || 'rgba(66,141,148,0.08)' },
} as const

export function chartGradientColor(index: number, total: number): string {
  const t = total <= 1 ? 1 : index / (total - 1)
  const r = Math.round(0xA7 + (0x42 - 0xA7) * t)
  const g = Math.round(0x00 + (0x8D - 0x00) * t)
  const b = Math.round(0x00 + (0x94 - 0x00) * t)
  return `rgb(${r},${g},${b})`
}

/** Verde: do verde vivo (#22C55E) no topo até o verde escuro (#166534) no fundo */
export function chartGreenColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1)
  const r = Math.round(0x22 + (0x16 - 0x22) * t)   // 34 → 22
  const g = Math.round(0xC5 + (0x65 - 0xC5) * t)   // 197 → 101
  const b = Math.round(0x5E + (0x34 - 0x5E) * t)   // 94 → 52
  return `rgb(${r},${g},${b})`
}

export function buildTooltipHtml(opts: {
  title: string
  rows: { label: string; value: string; color?: string; highlight?: boolean }[]
}): string {
  const borderVar = '#333333'
  const textVar   = '#e0e0e0'
  const brandVar  = '#428D94'

  const rows = opts.rows
    .map(({ label, value, color, highlight }) => `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  gap:16px;margin-top:5px;padding-top:5px;
                  ${highlight ? `border-top:1px solid ${borderVar}` : ''}">
        <span style="display:flex;align-items:center;gap:6px;
                     color:${textVar};font-size:12px;font-family:'Roboto',sans-serif">
          ${color
            ? `<span style="width:7px;height:7px;border-radius:50%;
                            background:${color};flex-shrink:0;
                            box-shadow:0 0 4px ${color}60"></span>`
            : ''}
          ${label}
        </span>
        <span style="font-size:${highlight ? '18px' : '16px'};
                     font-weight:${highlight ? '700' : '600'};
                     color:${highlight ? brandVar : textVar};
                     font-family:'Roboto',monospace">
          ${value}
        </span>
      </div>`)
    .join('')

  return `
    <div style="font-family:'Roboto',sans-serif;padding:4px 2px;min-width:180px">
      <div style="font-size:14px;font-weight:700;color:${brandVar};text-transform:uppercase;
                  letter-spacing:.1em;padding-bottom:7px;border-bottom:1px solid ${borderVar}">
        ${opts.title}
      </div>
      ${rows}
    </div>`
}

function useStaggerReveal(delay: number) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return visible
}

export type ChartClickParams = {
  name: string
  value: number
  dataIndex: number
  seriesIndex: number
  data?: unknown
}

interface ChartContainerProps {
  title?: string
  titleIcon?: ElementType
  subtitle?: string
  option: EChartsOption
  height?: number | string
  loading?: boolean
  error?: boolean
  empty?: boolean
  onRetry?: () => void
  className?: string
  onChartClick?: (params: ChartClickParams) => void
  onChartHover?: (params: ChartClickParams | null) => void
  onLegendClick?: (params: { name: string }) => void
  active?: boolean
  headerSlot?: React.ReactNode
  animationDelay?: number
  clickable?: boolean
  scrollable?: boolean
  maxVisibleHeight?: number
}

export const ChartContainer = memo(function ChartContainer({
  title,
  titleIcon: TitleIcon,
  subtitle,
  option,
  height = 280,
  loading,
  error,
  empty,
  onRetry,
  className,
  onChartClick,
  onChartHover,
  onLegendClick,
  active,
  headerSlot,
  animationDelay = 0,
  clickable = false,
  scrollable = false,
  maxVisibleHeight,
}: ChartContainerProps) {
  const chartRef = useRef<ReactECharts>(null)
  const visible = useStaggerReveal(animationDelay)
  const [isHovered, setIsHovered] = useState(false)

  const onClickRef  = useRef(onChartClick)
  const onHoverRef  = useRef(onChartHover)
  const onLegendRef = useRef(onLegendClick)
  useEffect(() => { onClickRef.current  = onChartClick  }, [onChartClick])
  useEffect(() => { onHoverRef.current  = onChartHover  }, [onChartHover])
  useEffect(() => { onLegendRef.current = onLegendClick }, [onLegendClick])

  const lastClickRef = useRef<{ key: string; ts: number } | null>(null)
  const handleClick = useCallback((p: unknown) => {
    if (!onClickRef.current) return
    const params = p as ChartClickParams
    const key = `${params.seriesIndex}-${params.dataIndex}`
    const now = Date.now()
    if (lastClickRef.current?.key === key && now - lastClickRef.current.ts < 400) return
    lastClickRef.current = { key, ts: now }
    onClickRef.current(params)
  }, []) // [] → função estável → ECharts nunca re-registra → zero duplicatas
  const handleMouseover   = useCallback((p: unknown) => onHoverRef.current?.(p as ChartClickParams), [])
  const handleMouseout    = useCallback(() => onHoverRef.current?.(null), [])
  const handleLegendClick = useCallback((p: unknown) => onLegendRef.current?.(p as { name: string }), [])

  // Objeto de eventos estável — recriado apenas quando o CONJUNTO de handlers muda
  const hasClick  = !!onChartClick
  const hasHover  = !!onChartHover
  const hasLegend = !!onLegendClick
  const eventsRef = useRef<Record<string, (p: unknown) => void>>({})
  useEffect(() => {
    const next: Record<string, (p: unknown) => void> = {}
    if (hasClick)  next['click']              = handleClick
    if (hasHover)  next['mouseover']          = handleMouseover
    if (hasHover)  next['mouseout']           = handleMouseout
    if (hasLegend) next['legendselectchanged'] = handleLegendClick
    eventsRef.current = next
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasClick, hasHover, hasLegend])

  const events = eventsRef.current

  if (loading) return <SkeletonChart className={cn('h-full', className)} />

  if (error) return (
    <Card className={cn(className)}>
      {title && (
        <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-3">
          {title}
        </p>
      )}
      <ErrorState onRetry={onRetry} />
    </Card>
  )

  return (
    <Card
      noPadding
      active={active}
      className={cn(
        'flex flex-col overflow-hidden',
        'transition-all duration-500 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        onChartClick && 'cursor-pointer',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      {(title || headerSlot) && (
        <div className="flex items-start justify-between px-4 pt-3 pb-1">
          <div>
            {title && (
              <div className="flex items-center gap-1.5">
                {TitleIcon && <TitleIcon size={13} className="text-brand flex-shrink-0" />}
                <h3 className="text-[12px] font-semibold uppercase tracking-widest" style={{ fontFamily: 'Roboto, sans-serif', color: 'var(--text-primary)' }}>
                  {title}
                </h3>
              </div>
            )}
            {subtitle && (
              <p className="text-[12px] text-text-muted mt-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {clickable && isHovered && !active && (
              <span className="text-[9px] text-brand/60 animate-pulse">
                clique para filtrar
              </span>
            )}
            {active && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/20">
                filtrado
              </span>
            )}
            {headerSlot}
          </div>
        </div>
      )}

      {/* Chart area */}
      {empty ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState />
        </div>
      ) : (maxVisibleHeight || scrollable) ? (
        /* Scrollable wrapper: div externo limita altura e faz scroll vertical;
           div interno tem a altura real do gráfico para o ECharts renderizar certo */
        <div
          style={{
            maxHeight: maxVisibleHeight ? `${maxVisibleHeight}px` : '420px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <div style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: 0 }}>
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: '100%', width: '100%' }}
              notMerge={false}
              lazyUpdate={true}
              onEvents={Object.keys(events).length ? events : undefined}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{
              height: typeof height === 'number' ? `${height}px` : height,
              width: '100%',
            }}
            notMerge={false}
            lazyUpdate={true}
            onEvents={Object.keys(events).length ? events : undefined}
          />
        </div>
      )}
    </Card>
  )
})