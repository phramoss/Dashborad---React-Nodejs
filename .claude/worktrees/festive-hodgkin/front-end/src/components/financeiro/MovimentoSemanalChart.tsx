import { memo, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { ChartContainer, getChartTheme, buildTooltipHtml } from '@/components/charts/ChartContainer'
import { useThemeStore } from '@/store/theme.store'
import { useMovimentoSemanal } from '@/hooks/useFinanceiroData'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

function fmtDia(iso: string): string {
  if (!iso || iso.length < 10) return iso
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
}

export const MovimentoSemanalChart = memo(function MovimentoSemanalChart() {
  const { data, isLoading, isError, refetch } = useMovimentoSemanal()
  const theme = useThemeStore(s => s.theme)
  const CT = getChartTheme(theme)

  const items  = data ?? []
  const labels = items.map(d => fmtDia(d.dia))

  const option = useMemo((): EChartsOption => ({
    grid: { top: 32, bottom: 24, left: 16, right: 16, containLabel: true },
    legend: {
      top: 4,
      right: 8,
      textStyle: { color: CT.textColor, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: CT.textColor, fontSize: 11 },
      axisLine:  { lineStyle: { color: CT.axisColor } },
      axisTick:  { show: false },
    },
    yAxis: { type: 'value', show: false },
    series: [
      {
        name: 'A Receber',
        type: 'bar',
        data: items.map(d => d.aReceber),
        itemStyle: { color: '#428D94', borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'top',
          formatter: (p: { value: number }) => fmtBRL(p.value),
          color: CT.textColor,
          fontSize: 10,
        },
        barMaxWidth: 32,
      },
      {
        name: 'A Pagar',
        type: 'bar',
        data: items.map(d => d.aPagar),
        itemStyle: { color: '#A70000', borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'top',
          formatter: (p: { value: number }) => fmtBRL(p.value),
          color: CT.textColor,
          fontSize: 10,
        },
        barMaxWidth: 32,
      },
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: CT.tooltipBg,
      borderColor: CT.tooltipBorder,
      formatter: (params: unknown) => {
        const ps = params as { seriesName: string; value: number; dataIndex: number; color: string }[]
        return buildTooltipHtml({
          title: labels[ps[0]?.dataIndex ?? 0] ?? '',
          rows: ps.map(p => ({ label: p.seriesName, value: fmtBRL(p.value), color: p.color })),
        })
      },
    },
  }), [items, labels, CT])

  return (
    <ChartContainer
      title="Movimento Semanal"
      option={option}
      height={260}
      loading={isLoading}
      error={isError}
      empty={!isLoading && items.length === 0}
      onRetry={refetch}
    />
  )
})
