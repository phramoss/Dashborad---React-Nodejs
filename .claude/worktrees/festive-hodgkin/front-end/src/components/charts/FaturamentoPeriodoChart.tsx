import { memo, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { ChevronLeft, ChevronsDown, ChevronDown, RotateCcw, TrendingUp } from 'lucide-react'
import { ChartContainer, CHART_COLORS, getChartTheme, buildTooltipHtml } from './ChartContainer'
import {
  useFaturamentoPeriodo,
  useFaturamentoPorMes,
  useFaturamentoTodosMeses,
} from '@/hooks/useDashboardData'
import { useFiltrosStore, useDrill } from '@/store/filtros.store'
import { useThemeStore } from '@/store/theme.store'
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

// ─── Botões estilo Power BI ───────────────────────────────────
interface DrillControlsProps {
  mode: 'none' | 'drill' | 'expandAll'
  onExpandAll: () => void
  onDrillNext: () => void
  onDrillUp: () => void
  canDrillUp: boolean
  canDrillNext: boolean
}

function DrillControls({ mode, onExpandAll, onDrillNext, onDrillUp, canDrillUp, canDrillNext }: DrillControlsProps) {
  const base = 'flex items-center justify-center w-6 h-6 rounded transition-all duration-150 border'
  const on   = 'border-brand bg-brand/20 text-brand hover:bg-brand/30'
  const off  = 'border-white/10 bg-white/5 text-white/40 hover:border-brand/50 hover:text-brand/70 hover:bg-brand/10'
  const dis  = 'border-white/5 bg-transparent text-white/15 cursor-not-allowed'

  return (
    <div className="flex items-center gap-1">
      {/* ▶ Expandir por nível — todos os anos em meses lado a lado */}
      <button
        onClick={onExpandAll}
        disabled={mode === 'expandAll'}
        className={`${base} ${mode === 'expandAll' ? on : off}`}
        title="▶ Expandir por nível — ver todos os meses de todos os anos"
      >
        <ChevronsDown size={12} />
      </button>

      {/* ⬇ Ir para o próximo nível — drill em 1 ano (requer 1 ano selecionado) */}
      <button
        onClick={onDrillNext}
        disabled={!canDrillNext}
        className={`${base} ${!canDrillNext ? dis : mode === 'drill' ? on : off}`}
        title={canDrillNext ? '⬇ Entrar nos meses do ano selecionado' : '⬇ Selecione um único ano primeiro'}
      >
        <ChevronDown size={12} />
      </button>

      {/* ⟲ Subir um nível — volta para anos */}
      <button
        onClick={onDrillUp}
        disabled={!canDrillUp}
        className={`${base} ${!canDrillUp ? dis : off}`}
        title="⟲ Subir um nível — voltar para anos"
      >
        <RotateCcw size={11} />
      </button>
    </div>
  )
}

// ─── Chart principal ──────────────────────────────────────────
export const FaturamentoPeriodoChart = memo(function FaturamentoPeriodoChart() {
  const { data: dataAnos, isLoading: loadingAnos, isError, refetch } = useFaturamentoPeriodo()
  const { filtros, toggleAno, toggleMes, drillInto, drillOut, expandAll } = useFiltrosStore()
  const drill = useDrill()
  const theme = useThemeStore(s => s.theme)
  const CT    = getChartTheme(theme)

  // Drill de 1 ano → meses daquele ano
  const { data: dataMeses, isLoading: loadingMes } = useFaturamentoPorMes(
    drill.mode === 'drill' ? drill.ano : null
  )

  // expandAll → todos os meses de todos os anos
  const { data: dataTodos, isLoading: loadingTodos } = useFaturamentoTodosMeses(
    drill.mode === 'expandAll'
  )

  const isLoading =
    drill.mode === 'drill'     ? loadingMes :
    drill.mode === 'expandAll' ? loadingTodos :
    loadingAnos

  const rawItems =
    drill.mode === 'drill'     ? (dataMeses ?? []) :
    drill.mode === 'expandAll' ? (dataTodos  ?? []) :
    (dataAnos ?? [])

  const items: { periodo: string; faturamento: number }[] = rawItems.map(d => ({
    periodo:     d.periodo,
    faturamento: d.faturamento,
  }))

  const mesNumByIndex: number[] = useMemo(() => {
    if (drill.mode === 'drill') {
      return (dataMeses ?? []).map(d => d.mesNumero ?? 0)
    }
    if (drill.mode === 'expandAll') {
      return (dataTodos ?? []).map(d => d.mesIdx + 1)
    }
    return []
  }, [drill.mode, dataMeses, dataTodos])

  const expandAllAnos: number[] = drill.mode === 'expandAll'
    ? (dataTodos ?? []).map(d => d.ano)
    : []

  const option = useMemo((): EChartsOption => {
    const withVar: PeriodoItem[] = items.map((d, i) => ({
      ...d,
      variacao: i === 0 ? null : calcVar(d.faturamento, items[i - 1].faturamento),
    }))
    const maxVal      = Math.max(...items.map(d => d.faturamento), 1)
    const activeAnos  = filtros.anos
    const activeMeses = filtros.meses

    const anoBreaks = new Set<number>()
    if (drill.mode === 'expandAll' && expandAllAnos.length > 0) {
      let lastAno = expandAllAnos[0]
      expandAllAnos.forEach((ano, i) => {
        if (i > 0 && ano !== lastAno) { anoBreaks.add(i); lastAno = ano }
      })
    }

    const xLabels = items.map((d, i) => {
      if (drill.mode !== 'expandAll') return d.periodo
      if (i === 0 || anoBreaks.has(i)) {
        return `{bold|${d.periodo}}`
      }
      return d.periodo
    })

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 300,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        backgroundColor: CT.tooltipBg,
        borderColor: CT.tooltipBorder,
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5)',
        formatter: (params: unknown) => {
          const [p] = params as Array<{ name: string; value: number; dataIndex: number }>
          const item = withVar[p.dataIndex]
          const anoLabel = drill.mode === 'expandAll' && expandAllAnos[p.dataIndex]
            ? ` (${expandAllAnos[p.dataIndex]})`
            : ''
          return buildTooltipHtml({
            title: p.name + anoLabel,
            rows: [
              { label: 'Faturamento', value: formatCurrency(p.value, true), color: CHART_COLORS.teal, highlight: true },
              ...(item.variacao !== null
                ? [{ label: 'Var. período', value: formatPercent(item.variacao), color: item.variacao >= 0 ? CHART_COLORS.teal : '#E74C3C' }]
                : []),
            ],
          })
        },
      },
      grid: { left: 12, right: 12, top: 28, bottom: drill.mode === 'expandAll' ? 40 : 24, containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLine: { lineStyle: { color: '#5a5e5d' } },
        axisTick: { show: false },
        axisLabel: {
          color: CT.textColor,
          fontSize: drill.mode === 'expandAll' ? 10 : 12,
          fontFamily: 'Roboto',
          margin: 10,
          rotate: drill.mode === 'expandAll' ? 45 : 0,
          rich: {
            bold: { color: CT.textColor, fontSize: 10, fontWeight: 'bold', fontFamily: 'Roboto' },
          },
        },
        splitLine: {
          show: drill.mode === 'expandAll',
          interval: (_: number, value: string) => {
            return value.includes('{bold|')
          },
          lineStyle: { color: '#ffffff20', type: 'dashed', width: 1 },
        },
      },
      yAxis: {
        type: 'value',
        max: maxVal * 1.18,
        splitLine: { lineStyle: { color: CT.gridLineColor, type: 'dashed', opacity: 0.6 } },
        axisLabel: {
          color: CT.textColor,
          fontSize: 12,
          fontFamily: 'Roboto',
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
          barMaxWidth: drill.mode === 'expandAll' ? 28 : 52,
          data: items.map((d, i) => {
            // ─── FIX: usa mesNumByIndex[i] (número real do mês) em vez de i+1 ───
            const mesNum = mesNumByIndex[i] ?? 0

            // FIX: expandAll agora suporta dimming por mês selecionado
            const dimmed =
              drill.mode === 'expandAll' ? (activeMeses.length > 0 && !activeMeses.includes(mesNum)) :
              drill.mode === 'drill'     ? (activeMeses.length > 0 && !activeMeses.includes(mesNum)) :
              drill.mode === 'none'      ? (activeAnos.length > 0  && !activeAnos.includes(Number(d.periodo))) :
              false

            // FIX: expandAll agora suporta highlight de barras selecionadas
            const isSelected =
              (drill.mode === 'expandAll' && activeMeses.includes(mesNum)) ||
              (drill.mode === 'drill'     && activeMeses.includes(mesNum)) ||
              (drill.mode === 'none'      && activeAnos.includes(Number(d.periodo)))

            const isMax = d.faturamento === maxVal

            const isNewAno = drill.mode === 'expandAll' && anoBreaks.has(i)
            const barColor = isNewAno ? CHART_COLORS.blue : CHART_COLORS.teal

            return {
              value: d.faturamento,
              itemStyle: {
                borderRadius: [4, 4, 0, 0],
                color: dimmed
                  ? `${barColor}22`
                  : isSelected
                  ? { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [{ offset: 0, color: '#428D94' }, { offset: 1, color: barColor }] }
                  : isMax
                  ? { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [{ offset: 0, color: '#428D94' }, { offset: 1, color: barColor }] }
                  : { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [{ offset: 0, color: `${barColor}CC` }, { offset: 1, color: `${barColor}66` }] },
                shadowBlur: 0,
                shadowColor: 'transparent',
              },
              emphasis: { disabled: true },
            }
          }),
          label: {
            show: true,
            position: 'top' as const,
            color: CT.textColor,
            fontSize: drill.mode === 'expandAll' ? 9 : 12,
            fontFamily: 'Roboto',
            formatter: (p: { value: unknown }) => {
              const v = Number(p.value)
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}Mi`
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
              return String(v)
            },
          },
        },
      ],
      // Marca visual de separação por ano no expandAll
      ...(drill.mode === 'expandAll' && anoBreaks.size > 0 ? {
        markLine: {
          data: Array.from(anoBreaks).map(idx => ({ xAxis: idx - 0.5 })),
          lineStyle: { color: '#ffffff30', type: 'solid', width: 1 },
          label: { show: false },
          symbol: 'none',
        },
      } : {}),
    }
  }, [items, filtros.anos, filtros.meses, drill, expandAllAnos, mesNumByIndex, theme])

  // Legenda de anos no expandAll (abaixo do gráfico)
  const anosNoExpandAll = useMemo(() => {
    if (drill.mode !== 'expandAll' || !dataTodos) return []
    const seen = new Set<number>()
    const result: { ano: number; startIdx: number }[] = []
    dataTodos.forEach((d, i) => {
      if (!seen.has(d.ano)) { seen.add(d.ano); result.push({ ano: d.ano, startIdx: i }) }
    })
    return result
  }, [drill.mode, dataTodos])

  const title =
    drill.mode === 'drill'     ? `${drill.label} — Mensal` :
    drill.mode === 'expandAll' ? 'Todos os Anos — Mensal' :
    'Faturamento por Período'

  const subtitle =
    drill.mode === 'drill'
      ? 'Clique nas barras para destacar meses · selecione múltiplos · clique novamente para remover'
      : drill.mode === 'expandAll'
      ? 'Clique nos meses para filtrar · selecione múltiplos · use ⟲ para voltar'
      : 'Clique uma vez para destacar o ano · clique novamente para entrar nos meses'

  const canDrillUp   = drill.mode !== 'none'
  const canDrillNext = drill.mode === 'none' && filtros.anos.length === 1

  return (
    <ChartContainer
      title={title}
      titleIcon={TrendingUp}
      subtitle={subtitle}
      option={option}
      loading={isLoading}
      error={isError}
      empty={!isLoading && items.length === 0}
      onRetry={() => refetch()}
      height={drill.mode === 'expandAll' ? 213 : 187}
      active={!drill.active && filtros.anos.length > 0}
      clickable
      animationDelay={0}
      headerSlot={
        <div className="flex items-center gap-3">
          {/* FIX: Badge de meses selecionados — visível em drill E expandAll */}
          {(drill.mode === 'drill' || drill.mode === 'expandAll') && filtros.meses.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/20">
              {filtros.meses.length} {filtros.meses.length === 1 ? 'mês' : 'meses'} selecionados
            </span>
          )}

          {/* Botões Power BI */}
          <DrillControls
            mode={drill.mode}
            canDrillUp={canDrillUp}
            canDrillNext={canDrillNext}
            onExpandAll={expandAll}
            onDrillNext={() => {
              if (drill.mode === 'none' && filtros.anos.length === 1) {
                const ano = filtros.anos[0]
                drillInto(ano, String(ano))
              }
            }}
            onDrillUp={drillOut}
          />

          {/* Botão Voltar textual */}
          {drill.active && (
            <button
              onClick={drillOut}
              className="flex items-center gap-1 text-[10px] text-brand hover:text-brand/80 transition-colors ml-1"
            >
              <ChevronLeft size={12} /> Voltar
            </button>
          )}
        </div>
      }
      onChartClick={(params) => {
        // ─── FIX: expandAll agora suporta multi-seleção de meses ───
        if (drill.mode === 'expandAll') {
          const mesNum = mesNumByIndex[params.dataIndex]
          if (mesNum) toggleMes(mesNum)
          return
        }

        if (drill.mode === 'drill') {
          // FIX: usa mesNumByIndex (número real do mês) em vez de dataIndex+1
          const mesNum = mesNumByIndex[params.dataIndex]
          if (mesNum) toggleMes(mesNum)
          return
        }

        // Modo anos: 1º clique destaca, 2º clique no mesmo ano entra nos meses
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
