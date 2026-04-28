import { memo, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { ChartContainer, getChartTheme, buildTooltipHtml } from '@/components/charts/ChartContainer'
import { useThemeStore } from '@/store/theme.store'
import { useFluxoCaixa } from '@/hooks/useFinanceiroData'
import type { FinanceiroFluxoPonto } from '@/types'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

function periodoLabel(p: number): string {
  const year  = Math.floor(p / 100)
  const month = p % 100
  const m = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][month - 1] ?? '?'
  return `${m}/${String(year).slice(-2)}`
}

export const FluxoCaixaChart = memo(function FluxoCaixaChart() {
  const { data, isLoading, isError, refetch } = useFluxoCaixa()
  const theme = useThemeStore(s => s.theme)
  const CT = getChartTheme(theme)

  const passado: FinanceiroFluxoPonto[] = data?.passado ?? []
  const futuro:  FinanceiroFluxoPonto[] = data?.futuro  ?? []

  const allPeriodos = [
    ...passado.map(p => p.periodo),
    ...futuro.map(p  => p.periodo),
  ]
  const labels      = allPeriodos.map(periodoLabel)
  const futuroOffset = passado.length

  const option = useMemo((): EChartsOption => {
    const passadoData = allPeriodos.map((_, i) => (i < passado.length ? passado[i].saldo : null))
    const futuroData  = allPeriodos.map((_, i) => (i >= futuroOffset ? futuro[i - futuroOffset].saldo : null))

    return {
      grid: { top: 32, bottom: 24, left: 16, right: 16, containLabel: true },
      legend: {
        top: 4, right: 8,
        textStyle: { color: CT.textColor, fontSize: 11 },
        itemWidth: 14, itemHeight: 3,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: CT.textColor, fontSize: 10, rotate: 35 },
        axisLine:  { lineStyle: { color: CT.axisColor } },
        axisTick:  { show: false },
        boundaryGap: false,
      },
      yAxis: { type: 'value', show: false },
      series: [
        {
          name: 'Histórico',
          type: 'line',
          data: passadoData,
          connectNulls: false,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#428D94', width: 2 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(66,141,148,0.20)' },
                { offset: 1, color: 'rgba(66,141,148,0.02)' },
              ],
            },
          },
        },
        {
          name: 'Projeção',
          type: 'line',
          data: futuroData,
          connectNulls: false,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#5AB5BC', width: 2, type: 'dashed' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(90,181,188,0.15)' },
                { offset: 1, color: 'rgba(90,181,188,0.01)' },
              ],
            },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: CT.tooltipBg,
        borderColor: CT.tooltipBorder,
        formatter: (params: unknown) => {
          const ps = params as { seriesName: string; value: number | null; dataIndex: number; color: string }[]
          const active = ps.filter(p => p.value !== null)
          if (!active.length) return ''
          return buildTooltipHtml({
            title: labels[active[0].dataIndex] ?? '',
            rows: active.map(p => ({ label: p.seriesName, value: fmtBRL(p.value!), color: p.color, highlight: true })),
          })
        },
      },
    }
  }, [passado, futuro, allPeriodos, labels, CT, futuroOffset])

  return (
    <ChartContainer
      title="Fluxo de Caixa"
      option={option}
      height={260}
      loading={isLoading}
      error={isError}
      empty={!isLoading && passado.length === 0 && futuro.length === 0}
      onRetry={refetch}
    />
  )
})
