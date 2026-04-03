import { memo, useMemo, useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useMapaFaturamento } from '@/hooks/useDashboardData'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import type { MapaMunicipio } from '@/types'

const BRAZIL_GEOJSON_URL =
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson'

// Cache em módulo: carregado 1x por sessão, nunca re-fetched
let geoJsonCache: unknown = null
let geoJsonPromise: Promise<unknown> | null = null

function loadBrazilGeoJson(): Promise<unknown> {
  if (geoJsonCache) return Promise.resolve(geoJsonCache)
  if (geoJsonPromise) return geoJsonPromise
  geoJsonPromise = fetch(BRAZIL_GEOJSON_URL)
    .then(r => r.json())
    .then(data => { geoJsonCache = data; return data })
  return geoJsonPromise
}

function normalizeSymbolSize(v: number, min: number, max: number): number {
  if (max === min) return 10
  return 8 + ((v - min) / (max - min)) * 30
}

export const MapaFaturamento = memo(function MapaFaturamento() {
  const { data, isLoading } = useMapaFaturamento()
  const chartRef   = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<echarts.ECharts | null>(null)

  const pontos: MapaMunicipio[] = useMemo(() => {
    if (!data) return []
    return data.filter(d => d.lat !== 0 && d.lng !== 0)
  }, [data])

  useEffect(() => {
    if (!chartRef.current || !pontos.length) return

    let cancelled = false

    async function init() {
      try {
        const geoJson = await loadBrazilGeoJson()
        if (cancelled || !chartRef.current) return

        echarts.registerMap('brazil', geoJson as Parameters<typeof echarts.registerMap>[1])

        if (!instanceRef.current) {
          instanceRef.current = echarts.init(chartRef.current, undefined, {
            renderer: 'canvas',
          })
        }

        const chart = instanceRef.current
        const values = pontos.map(p => p.faturamento)
        const minV = Math.min(...values, 0)
        const maxV = Math.max(...values, 1)

        const option: echarts.EChartsOption = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            backgroundColor: '#0E1120',
            borderColor: '#2D3554',
            borderWidth: 1,
            padding: [10, 14],
            extraCssText: 'border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5)',
            formatter: (params: unknown) => {
              const p = params as { data: { name: string; value: [number, number, number]; numClientes: number } }
              if (!p.data?.value) return ''
              const fat = p.data.value[2]
              const nc  = p.data.numClientes ?? 0
              return `
                <div style="font-family:'Roboto',sans-serif;min-width:160px">
                  <div style="font-size:13px;font-weight:700;color:#00D4AA;padding-bottom:6px;border-bottom:1px solid #2D3554;margin-bottom:6px">
                    ${p.data.name}
                  </div>
                  <div style="font-size:12px;color:#c9c9c9">Faturamento</div>
                  <div style="font-size:16px;font-weight:700;color:#00FFCC">${formatCurrency(fat, true)}</div>
                  <div style="font-size:11px;color:#8892B0;margin-top:4px">${nc} cliente${nc !== 1 ? 's' : ''}</div>
                </div>`
            },
          },
          geo: {
            map: 'brazil',
            roam: true,
            zoom: 1.1,
            center: [-51, -14],
            itemStyle: {
              areaColor: '#1A2240',
              borderColor: '#2D3554',
              borderWidth: 0.8,
            },
            emphasis: {
              disabled: true,
              label: { show: false },
            },
            label: { show: false },
          },
          series: [
            {
              type: 'effectScatter',
              coordinateSystem: 'geo',
              geoIndex: 0,
              data: pontos.map(p => ({
                name: `${p.municipio} - ${p.uf}`,
                value: [p.lng, p.lat, p.faturamento],
                numClientes: p.numClientes,
                symbolSize: normalizeSymbolSize(p.faturamento, minV, maxV),
              })),
              rippleEffect: {
                brushType: 'stroke',
                scale: 1.8,
                period: 5,
              },
              itemStyle: {
                color: '#00D4AA',
              },
              emphasis: {
                disabled: true,
              },
              zlevel: 2,
            },
          ],
        }

        chart.setOption(option, { notMerge: true })
      } catch (e) {
        console.warn('[MapaFaturamento] Erro ao carregar GeoJSON:', e)
      }
    }

    init()

    const ro = new ResizeObserver(() => instanceRef.current?.resize())
    if (chartRef.current) ro.observe(chartRef.current)

    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [pontos])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      instanceRef.current?.dispose()
      instanceRef.current = null
    }
  }, [])

  if (isLoading && !pontos.length) {
    return <Skeleton className="w-full h-full rounded-xl" style={{ minHeight: 220 }} />
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <p
        className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-2 px-1 shrink-0"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        Distribuição por Município
      </p>
      <div ref={chartRef} className="flex-1 min-h-0 w-full" style={{ minHeight: 220 }} />
    </div>
  )
})
