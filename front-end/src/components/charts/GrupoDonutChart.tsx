import { memo, useMemo, useCallback } from 'react'
import type { EChartsOption } from 'echarts'
import { ChartContainer, CHART_THEME, buildTooltipHtml } from './ChartContainer'
import { useFaturamentoGrupo } from '@/hooks/useDashboardData'
import { useFiltrosStore, useHover } from '@/store/filtros.store'
import { formatCurrency } from '@/lib/utils'

const DONUT_PALETTE = ['#00D4AA', '#4A90D9', '#7B5EA7', '#F5A623', '#E056A0', '#F7DC6F']

function sanitizeName(name: string): string {
  return name.replace(/\uFFFD/g, 'Ç').trim()
}

export const GrupoDonutChart = memo(function GrupoDonutChart() {
  const { data, isLoading, isError, refetch } = useFaturamentoGrupo()
  const { filtros, toggleGrupo, setHover, clearHover } = useFiltrosStore()
  const hover = useHover()

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

  const total = useMemo(() => items.reduce((s, d) => s + d.faturamento, 0), [items])

  // Valor exibido no centro: soma dos selecionados, ou total geral se nenhum
  const totalExibido = useMemo(() => {
    if (filtros.grupos.length === 0) return total
    return items
      .filter(d => filtros.grupos.includes(d.grupoId))
      .reduce((s, d) => s + d.faturamento, 0)
  }, [items, filtros.grupos, total])

  const isHoveredFromOther = hover.dimension !== null && hover.dimension !== 'grupo'

  const option = useMemo((): EChartsOption => {
    const activeIds = filtros.grupos

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
        orient: 'horizontal',
        top: 0,
        left: 'center',
        pageButtonItemGap: 5,
        pageButtonGap: 8,
        pageButtonPosition: 'end',
        pageIconColor: '#c9c9c9',
        pageIconInactiveColor: '#3A4060',
        pageIconSize: 12,
        pageTextStyle: {
          color: '#c9c9c9',
          fontSize: 10,
          fontFamily: 'Roboto',
        },
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 14,
        icon: 'circle',
        // Desabilita show/hide nativo — controle fica no store
        selectedMode: false,
        textStyle: {
          color: '#c9c9c9',
          fontSize: 12,
          fontFamily: 'Roboto',
          rich: {
            dim: {
              color: '#3A4060',
              fontSize: 12,
              fontFamily: 'Roboto',
            },
          },
        },
        formatter: (name: string) => {
          const item = items.find((d) => d.grupoNome === name)
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
        center: ['50%', '58%'],
        avoidLabelOverlap: true,
        // Label central fixo no buraco do donut — sempre centralizado
        label: {
          show: true,
          position: 'center',
          formatter: () => [
            `{value|${formatCurrency(totalExibido, true)}}`,
            `{sub|${filtros.grupos.length > 0 ? 'Selecionado' : 'Total'}}`,
          ].join('\n'),
          rich: {
            value: {
              color: filtros.grupos.length > 0 ? '#00D4AA' : '#E8EAF0',
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
        emphasis: { scale: true, scaleSize: 6, label: { show: true } },
        data: items.map((d, i) => {
          const isActive = activeIds.length === 0 || activeIds.includes(d.grupoId)
          const isDimmed = !isActive || isHoveredFromOther
          const color    = DONUT_PALETTE[i % DONUT_PALETTE.length]
          return {
            name: d.grupoNome,
            value: d.faturamento,
            itemStyle: {
              color: isDimmed ? `${color}25` : color,
              borderWidth: 2,
              borderColor: '#161929',
            },
          }
        }),
      }],
      graphic: [],
    }
  }, [items, filtros.grupos, total, totalExibido, isHoveredFromOther])

  const handleHover = useCallback((params: { dataIndex: number } | null) => {
    if (!params) { clearHover(); return }
    const item = items[params.dataIndex]
    if (item) setHover({ dimension: 'grupo', id: item.grupoId })
  }, [items, setHover, clearHover])

  const handleLegendClick = useCallback((params: { name: string }) => {
    const item = items.find(d => d.grupoNome === params.name)
    if (item) toggleGrupo(item.grupoId)
  }, [items, toggleGrupo])

  return (
    <ChartContainer
      title="Faturamento por Grupo"
      option={option}
      loading={isLoading}
      error={isError}
      empty={!isLoading && items.length === 0}
      onRetry={() => refetch()}
      height={260}
      active={filtros.grupos.length > 0}
      animationDelay={50}
      clickable
      onChartClick={(params) => {
        const item = items.find(d => d.grupoNome === params.name)
        if (item) toggleGrupo(item.grupoId)
      }}
      onChartHover={handleHover}
      onLegendClick={handleLegendClick}
    />
  )
})