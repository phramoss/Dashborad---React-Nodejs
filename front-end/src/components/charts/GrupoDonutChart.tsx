import { memo, useMemo, useCallback } from 'react'
import type { EChartsOption } from 'echarts'
import { PieChart } from 'lucide-react'
import { ChartContainer, CHART_THEME, buildTooltipHtml } from './ChartContainer'
import { useFaturamentoGrupo } from '@/hooks/useDashboardData'
import { useFiltrosStore, useFilteredGrupos } from '@/store/filtros.store'
import { formatCurrency } from '@/lib/utils'

const DONUT_PALETTE = ['#428D94', '#A70000', '#AA3E98', '#4A90D9', '#F5A623']

function sanitizeName(name: string): string {
  return name.replace(/\uFFFD/g, 'Ç').trim()
}

export const GrupoDonutChart = memo(function GrupoDonutChart() {
  const { data, isLoading, isError, refetch } = useFaturamentoGrupo()
  const activeGrupos = useFilteredGrupos()
  const toggleGrupo = useFiltrosStore(s => s.toggleGrupo)

  const items = useMemo(() => {
    return (data ?? [])
      .map(d => ({
        ...d,
        grupoNome: d.grupoId === 0 || d.grupoNome === 'Grupo null' || d.grupoNome === 'Grupo 0'
          ? 'Sem Grupo'
          : sanitizeName(d.grupoNome),
      }))
      .filter(d => d.faturamento > 0)
  }, [data])

  // FIX: Map para lookup O(1) dentro do formatter (hot path no hover)
  // Antes: items.find() = O(n) a cada movimento do mouse sobre o gráfico
  const itemsByName = useMemo(() => {
    const m = new Map<string, typeof items[number]>()
    items.forEach(d => m.set(d.grupoNome, d))
    return m
  }, [items])

  const total = useMemo(() => items.reduce((s, d) => s + d.faturamento, 0), [items])

  // Valor exibido no centro: soma dos selecionados, ou total geral se nenhum
  const totalExibido = useMemo(() => {
    if (activeGrupos.length === 0) return total
    return items
      .filter(d => activeGrupos.includes(d.grupoId))
      .reduce((s, d) => s + d.faturamento, 0)
  }, [items, activeGrupos, total])

  const option = useMemo((): EChartsOption => {
    const activeIds = activeGrupos

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 350,
      animationEasing: 'cubicOut' as const,
      grid: { containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: CHART_THEME.tooltipBg,
        borderColor: CHART_THEME.tooltipBorder,
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5)',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number; color: string; dataIndex: number }
          return buildTooltipHtml({
            title: p.name,
            rows: [
              { label: 'Faturamento', value: formatCurrency(p.value, true), color: p.color, highlight: true },
              { label: 'Participação', value: `${p.percent.toFixed(1)}%` },
              { label: 'Total Geral',  value: formatCurrency(total, true) },
            ],
          })
        },
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        top: 'middle',
        left: 'right',
        align: 'left',
        pageButtonItemGap: 5,
        pageButtonGap: 8,
        pageButtonPosition: 'end',
        pageIconColor: CHART_THEME.textColor,
        pageIconInactiveColor: CHART_THEME.axisColor,
        pageIconSize: 12,
        pageTextStyle: {
          color: CHART_THEME.textColor,
          fontSize: 10,
          fontFamily: 'Roboto',
        },
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 10,
        icon: 'circle',
        padding: [0, 4],
        // Desabilita show/hide nativo — controle fica no store
        selectedMode: false,
        textStyle: {
          color: CHART_THEME.textColor,
          fontSize: 11,
          fontFamily: 'Roboto',
          rich: {
            dim: {
              color: CHART_THEME.axisColor,
              fontSize: 11,
              fontFamily: 'Roboto',
            },
          },
        },
        formatter: (name: string) => {
          const item = itemsByName.get(name)
          if (!item) return name
          const isActive = activeIds.length === 0 || activeIds.includes(item.grupoId)
          const pct = ((item.faturamento / total) * 100).toFixed(1)
          const label = name.length > 14 ? name.slice(0, 13) + '…' : name
          return isActive
            ? `${label}  ${pct}%`
            : `{dim|${label}  ${pct}%}`
        },
      },
      series: [{
        type: 'pie',
        radius: ['46%', '72%'],
        center: ['38%', '55%'],
        avoidLabelOverlap: true,
        // Label central fixo no buraco do donut — sempre centralizado
        label: {
          show: true,
          position: 'center',
          formatter: () => [
            `{value|${formatCurrency(totalExibido, true)}}`,
            `{sub|${activeGrupos.length > 0 ? 'Selecionado' : 'Total'}}`,
          ].join('\n'),
          rich: {
            value: {
              color: CHART_THEME.textColor,
              fontSize: 16,
              fontWeight: '600',
              fontFamily: 'Roboto',
              lineHeight: 24,
              align: 'center',
            },
            sub: {
              color: '#c6c6c6',
              fontSize: 14,
              fontFamily: 'Roboto',
              lineHeight: 17,
              align: 'center',
            },
          },
        },
        emphasis: { disabled: true, label: { show: true } },
        data: items.map((d, i) => {
          const isActive = activeIds.length === 0 || activeIds.includes(d.grupoId)
          const color    = DONUT_PALETTE[i % DONUT_PALETTE.length]
          return {
            name: d.grupoNome,
            value: d.faturamento,
            itemStyle: {
              color: isActive ? color : `${color}25`,
              borderWidth: 0,
            },
          }
        }),
      }],
      graphic: [],
    }
  }, [items, itemsByName, activeGrupos, total, totalExibido])

  const handleLegendClick = useCallback((params: { name: string }) => {
    const item = itemsByName.get(params.name)
    if (item) toggleGrupo(item.grupoId)
  }, [itemsByName, toggleGrupo])

  return (
    <ChartContainer
      title="Faturamento por Grupo"
      titleIcon={PieChart}
      option={option}
      loading={isLoading}
      error={isError}
      empty={!isLoading && items.length === 0}
      onRetry={() => refetch()}
      height={260}
      active={activeGrupos.length > 0}
      animationDelay={50}
      clickable
      onChartClick={(params) => {
        const item = itemsByName.get(params.name)
        if (item) toggleGrupo(item.grupoId)
      }}
      onLegendClick={handleLegendClick}
    />
  )
})