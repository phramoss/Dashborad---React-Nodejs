import { memo, useMemo, useCallback } from 'react'
import type { EChartsOption } from 'echarts'
import { ChartContainer, CHART_COLORS, CHART_THEME, buildTooltipHtml } from './ChartContainer'
import { useFaturamentoCliente } from '@/hooks/useDashboardData'
import { useFiltrosStore, useHover } from '@/store/filtros.store'
import { formatCurrency, truncate } from '@/lib/utils'

export const TopClientesChart = memo(function TopClientesChart() {
  const { data, isLoading, isError, refetch } = useFaturamentoCliente()
  const { filtros, toggleCliente, setHover, clearHover } = useFiltrosStore()
  const hover = useHover()

  const items = useMemo(() => (data ?? []).slice(0, 10), [data])
  const total = useMemo(() => items.reduce((s, d) => s + d.faturamento, 0), [items])

  const isHoveredFromOther = hover.dimension !== null && hover.dimension !== 'cliente'

  const option = useMemo((): EChartsOption => {
    const activeIds = filtros.clientes
    const max = Math.max(...items.map((d) => d.faturamento), 1)

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicOut' as const,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        backgroundColor: CHART_THEME.tooltipBg,
        borderColor: CHART_THEME.tooltipBorder,
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5)',
        formatter: (params: unknown) => {
          const p = (params as { name: string; value: number; dataIndex: number }[])[0]
          const item = items[p.dataIndex]
          const pct  = total > 0 ? ((item.faturamento / total) * 100).toFixed(1) : '0'
          return buildTooltipHtml({
            title: item.clienteNome,
            rows: [
              { label: 'Faturamento', value: formatCurrency(p.value, true), color: CHART_COLORS.teal, highlight: true },
              { label: '%',       value: `${pct}% do total` },
            ],
          })
        },
      },
      grid: { left: 8, right: 80, top: 4, bottom: 4, containLabel: true },
      xAxis: { type: 'value', show: false, max },
      yAxis: {
        type: 'category',
        data: items.map((d) => truncate(d.clienteNome, 20)),
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: CHART_THEME.textColor, fontSize: 10, fontFamily: 'IBM Plex Sans', width: 118, overflow: 'truncate' as const },
      },
      series: [{
        type: 'bar',
        barMaxWidth: 14,
        data: items.map((d) => {
          const isActive   = activeIds.length === 0 || activeIds.includes(d.clienteId)
          const isDimmed   = !isActive || isHoveredFromOther
          return {
            value: d.faturamento,
            itemStyle: {
              borderRadius: [0, 3, 3, 0],
              color: isDimmed ? `${CHART_COLORS.teal}28` : CHART_COLORS.teal,
            },
            emphasis: { itemStyle: { color: CHART_COLORS.teal, shadowBlur: 8, shadowColor: `${CHART_COLORS.teal}50` } },
          }
        }),
        label: {
          show: true, position: 'right' as const,
          color: CHART_THEME.textColor, fontSize: 10, fontFamily: 'IBM Plex Mono',
          formatter: (p: { value: number }) => formatCurrency(p.value, true),
        },
      }],
    }
  }, [items, filtros.clientes, total, isHoveredFromOther])

  const handleHover = useCallback((params: { dataIndex: number } | null) => {
    if (!params) { clearHover(); return }
    const item = items[params.dataIndex]
    if (item) setHover({ dimension: 'cliente', id: item.clienteId })
  }, [items, setHover, clearHover])

  return (
    <ChartContainer
      title="Top Clientes"
      option={option}
      loading={isLoading}
      error={isError}
      empty={!isLoading && items.length === 0}
      onRetry={() => refetch()}
      height={320}
      active={filtros.clientes.length > 0}
      animationDelay={100}
      clickable
      onChartClick={(params) => {
        const item = items[params.dataIndex]
        if (item) toggleCliente(item.clienteId)
      }}
      onChartHover={handleHover}
    />
  )
})
