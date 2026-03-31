import { memo, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { ChevronLeft } from 'lucide-react'
import { ChartContainer, CHART_COLORS, CHART_THEME, buildTooltipHtml } from './ChartContainer'
import { useFaturamentoPeriodo, useFaturamentoPorMes } from '@/hooks/useDashboardData'
import { useFiltrosStore, useDrill } from '@/store/filtros.store'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface PeriodoItem {
  periodo: string
  faturamento: number
  variacao: number | null
}

function calcVar(atual: number, anterior: number | null): number | null {
  if (!anterior) return null
  return ((atual - anterior) / anterior) * 100
}

export const FaturamentoPeriodoChart = memo(function FaturamentoPeriodoChart() {
  const { data: dataAnos, isLoading: loadingAnos, isError, refetch } = useFaturamentoPeriodo()
  const { filtros, toggleAno, toggleMes, drillInto, drillOut, resetFiltro } = useFiltrosStore()
  const drill = useDrill()

  const { data: dataMeses, isLoading: loadingMes } = useFaturamentoPorMes(
    drill.active ? drill.ano : null
  )

  const isLoading = drill.active ? loadingMes : loadingAnos
  const items = drill.active ? (dataMeses ?? []) : (dataAnos ?? [])

  const option = useMemo((): EChartsOption => {
    const withVar: PeriodoItem[] = items.map((d, i) => ({
      ...d,
      variacao: i === 0 ? null : calcVar(d.faturamento, items[i - 1].faturamento),
    }))
    const maxVal = Math.max(...items.map((d) => d.faturamento), 1)
    const activeAnos  = filtros.anos
    const activeMeses = filtros.meses

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        backgroundColor: CHART_THEME.tooltipBg,
        borderColor: CHART_THEME.tooltipBorder,
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5)',
        formatter: (params: unknown) => {
          const [p] = params as Array<{ name: string; value: number; dataIndex: number }>
          const item = withVar[p.dataIndex]
          return buildTooltipHtml({
            title: p.name,
            rows: [
              { label: 'Faturamento', value: formatCurrency(p.value, true), color: CHART_COLORS.teal, highlight: true },
              ...(item.variacao !== null
                ? [{ label: 'Var. período', value: formatPercent(item.variacao), color: item.variacao >= 0 ? '#00D4AA' : '#E74C3C' }]
                : []),
            ],
          })
        },
      },
      grid: { left: 12, right: 12, top: 28, bottom: 24, containLabel: true },
      xAxis: {
        type: 'category',
        data: items.map((d) => d.periodo),
        axisLine: { lineStyle: { color: CHART_THEME.axisColor } },
        axisTick: { show: false },
        axisLabel: { color: CHART_THEME.textColor, fontSize: 11, fontFamily: 'IBM Plex Sans', margin: 10 },
      },
      yAxis: {
        type: 'value',
        max: maxVal * 1.18,
        splitLine: { lineStyle: { color: CHART_THEME.gridLineColor, type: 'dashed', opacity: 0.6 } },
        axisLabel: {
          color: CHART_THEME.textColor,
          fontSize: 10,
          fontFamily: 'IBM Plex Mono',
          formatter: (v: number) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Mi`
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
            return String(v)
          },
        },
      },
      series: [
        {
          name: 'Faturamento',
          type: 'bar',
          barMaxWidth: 52,
          data: items.map((d, i) => {
            // No modo drill (meses): dimming por mês selecionado
            // No modo anos: dimming por ano selecionado
            const dimmed = drill.active
              ? activeMeses.length > 0 && !activeMeses.includes(i + 1)
              : activeAnos.length > 0 && !activeAnos.includes(Number(d.periodo))

            const isMax = d.faturamento === maxVal
            return {
              value: d.faturamento,
              itemStyle: {
                borderRadius: [4, 4, 0, 0],
                color: dimmed
                  ? `${CHART_COLORS.teal}22`
                  : isMax
                  ? { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#00FFCC' }, { offset: 1, color: CHART_COLORS.teal }] }
                  : { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${CHART_COLORS.teal}CC` }, { offset: 1, color: `${CHART_COLORS.teal}66` }] },
              },
              emphasis: { itemStyle: { color: CHART_COLORS.teal, shadowBlur: 12, shadowColor: `${CHART_COLORS.teal}50` } },
            }
          }),
          label: {
            show: true,
            position: 'top' as const,
            color: CHART_THEME.textColor,
            fontSize: 10,
            fontFamily: 'IBM Plex Mono',
            formatter: (p: { value: unknown }) => {
              const v = Number(p.value)
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}Mi`
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
              return String(v)
            },
          },
        },
      ],
    }
  }, [items, filtros.anos, filtros.meses, drill])

  return (
    <ChartContainer
      title={drill.active ? `${drill.label} — Mensal` : 'Faturamento por Período'}
      subtitle={
        drill.active
          ? 'Clique numa barra para filtrar o mês'
          : 'Clique numa barra para ver meses · clique novamente para filtrar'
      }
      option={option}
      loading={isLoading}
      error={isError}
      empty={!isLoading && items.length === 0}
      onRetry={() => refetch()}
      height={260}
      active={filtros.anos.length > 0 || filtros.meses.length > 0}
      clickable
      animationDelay={0}
      headerSlot={
        drill.active ? (
          <button
            onClick={drillOut}
            className="flex items-center gap-1 text-[10px] text-brand hover:text-brand/80 transition-colors"
          >
            <ChevronLeft size={12} /> Voltar
          </button>
        ) : undefined
      }
      onChartClick={(params) => {
        if (drill.active) {
          // Modo meses: toggle pelo índice (1-based) para compatibilidade com filtro numérico
          const mes = params.dataIndex + 1
          toggleMes(mes)
          return
        }
        // Modo anos: primeiro clique filtra, segundo clique faz drill-down
        const ano = Number(params.name)
        if (isNaN(ano)) return
        if (filtros.anos.includes(ano)) {
          drillInto(ano, params.name)
        } else {
          toggleAno(ano)
        }
      }}
    />
  )
})