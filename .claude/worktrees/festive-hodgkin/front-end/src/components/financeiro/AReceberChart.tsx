import { memo, useState, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { ChartContainer, getChartTheme, buildTooltipHtml } from '@/components/charts/ChartContainer'
import { useThemeStore } from '@/store/theme.store'
import { useAReceber } from '@/hooks/useFinanceiroData'
import { cn } from '@/lib/utils'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

type Agrupar = 'cliente' | 'vendedor' | 'cobranca'

const TOGGLE: { key: Agrupar; label: string }[] = [
  { key: 'cliente',  label: 'Cliente'  },
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'cobranca', label: 'Cobrança' },
]

export const AReceberChart = memo(function AReceberChart() {
  const [agrupar, setAgrupar] = useState<Agrupar>('cliente')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { data, isLoading, isError, refetch } = useAReceber(agrupar)
  const theme = useThemeStore(s => s.theme)
  const CT = getChartTheme(theme)

  const items = data ?? []
  const rowH   = Math.max(28, Math.min(48, 320 / Math.max(items.length, 1)))
  const chartH = Math.max(160, items.length * rowH)

  const option = useMemo((): EChartsOption => ({
    grid: { top: 8, bottom: 8, left: 8, right: 16, containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: items.map(d => d.label),
      inverse: true,
      axisLabel: { color: CT.textColor, fontSize: 11, width: 160, overflow: 'truncate' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: items.map(d => ({
        value: d.total,
        itemStyle: {
          color: selected.size === 0 || selected.has(d.label) ? '#428D94' : 'rgba(66,141,148,0.2)',
          borderRadius: [0, 4, 4, 0],
        },
      })),
      label: {
        show: true,
        position: 'right',
        formatter: (p: { value: number }) => fmtBRL(p.value),
        color: CT.textColor,
        fontSize: 11,
      },
      barMaxWidth: 28,
    }],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      backgroundColor: CT.tooltipBg,
      borderColor: CT.tooltipBorder,
      formatter: (params: unknown) => {
        const p = (params as { name: string; value: number }[])[0]
        return buildTooltipHtml({ title: p.name, rows: [{ label: 'A Receber', value: fmtBRL(p.value), color: '#428D94', highlight: true }] })
      },
    },
  }), [items, selected, CT])

  const headerSlot = (
    <div className="flex rounded-lg overflow-hidden border border-[var(--border)] h-7">
      {TOGGLE.map(({ key, label }, i) => (
        <button
          key={key}
          onClick={() => setAgrupar(key)}
          className={cn(
            'px-2.5 text-[10px] font-medium transition-all',
            i < TOGGLE.length - 1 && 'border-r border-[var(--border)]',
            agrupar === key
              ? 'bg-brand/15 text-brand'
              : 'text-white/80 hover:text-white bg-[var(--surface-light)]',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <ChartContainer
      title="A Receber"
      option={option}
      height={chartH}
      loading={isLoading}
      error={isError}
      empty={!isLoading && items.length === 0}
      onRetry={refetch}
      headerSlot={headerSlot}
      scrollable
      maxVisibleHeight={280}
      clickable
      active={selected.size > 0}
      onChartClick={(params) => {
        const item = items[params.dataIndex]
        if (!item) return
        setSelected(prev => {
          const next = new Set(prev)
          if (next.has(item.label)) next.delete(item.label)
          else next.add(item.label)
          return next
        })
      }}
    />
  )
})
