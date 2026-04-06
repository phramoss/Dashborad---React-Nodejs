import { memo, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { ChartContainer, CHART_COLORS, CHART_THEME, buildTooltipHtml } from './ChartContainer'
import { useFaturamentoCliente } from '@/hooks/useDashboardData'
import { useFiltrosStore, useFilteredClientes } from '@/store/filtros.store'
import { formatCurrency, truncate } from '@/lib/utils'

export const TopClientesChart = memo(function TopClientesChart() {
  const { data, isLoading, isError, refetch } = useFaturamentoCliente()
  // PERFORMANCE: seletor granular — só re-renderiza quando clientes muda,
  // não quando hover/drill/vendedores/etc mudam.
  const activeClientes = useFilteredClientes()
  const toggleCliente = useFiltrosStore(s => s.toggleCliente)

  const items = useMemo(() => (data ?? []), [data])
  const total = useMemo(() => items.reduce((s, d) => s + d.faturamento, 0), [items])

  const option = useMemo((): EChartsOption => {
    const activeIds = activeClientes
    const max = Math.max(...items.map((d) => d.faturamento), 1)

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 350,
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
        axisLabel: { color: '#c9c9c9', fontSize: 12, fontFamily: 'Roboto', width: 150, overflow: 'truncate' as const },
      },
      series: [{
        type: 'bar',
        barMaxWidth: 14,
        data: items.map((d) => {
          const isActive = activeIds.length === 0 || activeIds.includes(d.clienteId)
          return {
            value: d.faturamento,
            itemStyle: {
              borderRadius: [0, 3, 3, 0],
              color: isActive ? CHART_COLORS.teal : `${CHART_COLORS.teal}28`,
            },
            emphasis: { disabled: true },
          }
        }),
        label: {
          show: true, position: 'right' as const,
          color: '#c9c9c9', fontSize: 13, fontFamily: 'Roboto',
          formatter: (p: { value: number }) => formatCurrency(p.value, true),
        },
      }],
    }
  }, [items, activeClientes, total])

  // Altura total real do gráfico: 28px por barra
  const BAR_HEIGHT = 28
  const chartInnerHeight = Math.max(items.length * BAR_HEIGHT + 8, 200)
  // Container visível limitado a 420px; o gráfico cresce e o div faz scroll
  const visibleHeight = 280

  return (
    <ChartContainer
      title="Faturamento por Clientes"
      option={option}
      loading={isLoading}
      error={isError}
      empty={!isLoading && items.length === 0}
      onRetry={() => refetch()}
      height={chartInnerHeight}
      maxVisibleHeight={visibleHeight}
      active={activeClientes.length > 0}
      animationDelay={100}
      clickable
      onChartClick={(params) => {
        const item = items[params.dataIndex]
        if (item) toggleCliente(item.clienteId)
      }}
    />
  )
})