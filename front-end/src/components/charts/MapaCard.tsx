import { memo, useMemo, useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMapaFaturamento } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/utils'
import type { MapaMunicipio } from '@/types'

const BRAZIL_GEOJSON_URL =
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson'

// Cache singleton — 1 fetch por sessão
let geoJsonCache: unknown = null
let geoJsonPromise: Promise<unknown> | null = null

function loadBrazilGeoJson(): Promise<unknown> {
  if (geoJsonCache) return Promise.resolve(geoJsonCache)
  if (geoJsonPromise) return geoJsonPromise
  geoJsonPromise = fetch(BRAZIL_GEOJSON_URL)
    .then(r => { if (!r.ok) throw new Error(`GeoJSON HTTP ${r.status}`); return r.json() })
    .then(data => { geoJsonCache = data; return data })
  return geoJsonPromise
}

function normalizeSymbolSize(v: number, min: number, max: number): number {
  if (max === min) return 12
  return 8 + ((v - min) / (max - min)) * 32
}

// ─── Mapa ECharts ────────────────────────────────────────────────────────────
const MapaInner = memo(function MapaInner({ pontos }: { pontos: MapaMunicipio[] }) {
  const chartRef    = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<echarts.ECharts | null>(null)
  const [geoError, setGeoError] = useState(false)

  useEffect(() => {
    if (!chartRef.current) return
    let cancelled = false

    async function init() {
      try {
        const geoJson = await loadBrazilGeoJson()
        if (cancelled || !chartRef.current) return

        echarts.registerMap('brazil', geoJson as Parameters<typeof echarts.registerMap>[1])

        if (!instanceRef.current) {
          instanceRef.current = echarts.init(chartRef.current, undefined, { renderer: 'canvas' })
        }

        const chart  = instanceRef.current
        const values = pontos.map(p => p.faturamento)
        const minV   = values.length ? Math.min(...values) : 0
        const maxV   = values.length ? Math.max(...values) : 1

        chart.setOption({
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            backgroundColor: '#0E1120',
            borderColor: '#2D3554',
            borderWidth: 1,
            padding: [10, 14],
            extraCssText: 'border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5)',
            formatter: (params: unknown) => {
              const p = params as { data?: { name: string; value: [number, number, number]; numClientes: number } }
              if (!p.data?.value) return ''
              const fat = p.data.value[2]
              const nc  = p.data.numClientes ?? 0
              return `
                <div style="font-family:'Roboto',sans-serif;min-width:160px">
                  <div style="font-size:13px;font-weight:700;color:#00D4AA;padding-bottom:6px;
                              border-bottom:1px solid #2D3554;margin-bottom:6px">
                    ${p.data.name}
                  </div>
                  <div style="font-size:12px;color:#c9c9c9">Faturamento</div>
                  <div style="font-size:16px;font-weight:700;color:#00FFCC">${formatCurrency(fat, true)}</div>
                  <div style="font-size:11px;color:#8892B0;margin-top:4px">
                    ${nc} cliente${nc !== 1 ? 's' : ''}
                  </div>
                </div>`
            },
          },
          geo: {
            map: 'brazil',
            roam: true,
            zoom: 1.15,
            center: [-51, -14],
            itemStyle: { areaColor: '#1A2240', borderColor: '#2D3554', borderWidth: 0.8 },
            emphasis: {
              disabled: true,
              label: { show: false },
            },
            label: { show: false },
          },
          /*
           * FIX DO MAPA VAZIO:
           * Antes: se pontos === [] → EmptyState substituía o mapa inteiro.
           * Agora: o mapa do Brasil é SEMPRE renderizado (GeoJSON do geo layer).
           * A série effectScatter é opcional — sem pontos, fica vazia mas o
           * mapa de fundo aparece corretamente.
           * Isso separa dois problemas distintos:
           *   1. GeoJSON não carregou → geoError = true → mensagem de erro
           *   2. API sem dados de lat/lng → mapa aparece sem bolhas + aviso
           */
          series: pontos.length ? [{
            type: 'effectScatter',
            coordinateSystem: 'geo',
            geoIndex: 0,
            data: pontos.map(p => ({
              name: `${p.municipio} - ${p.uf}`,
              value: [p.lng, p.lat, p.faturamento],
              numClientes: p.numClientes,
              symbolSize: normalizeSymbolSize(p.faturamento, minV, maxV),
            })),
            rippleEffect: { brushType: 'stroke', scale: 1.8, period: 5 },
            itemStyle: { color: '#00D4AA' },
            emphasis: { disabled: true },
            zlevel: 2,
          }] : [],
        } satisfies echarts.EChartsOption, { notMerge: true })
      } catch (e) {
        console.warn('[MapaCard] Erro ao carregar GeoJSON:', e)
        if (!cancelled) setGeoError(true)
      }
    }

    init()

    const ro = new ResizeObserver(() => instanceRef.current?.resize())
    ro.observe(chartRef.current!)

    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [pontos])

  useEffect(() => () => {
    instanceRef.current?.dispose()
    instanceRef.current = null
  }, [])

  if (geoError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <span className="text-[11px] text-text-muted">Não foi possível carregar o mapa.</span>
        <span className="text-[10px] text-text-muted/60">Verifique a conexão com a internet.</span>
      </div>
    )
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={chartRef} className="w-full h-full" style={{ minHeight: 260 }} />

      {/* Aviso sobreposto quando não há pontos: mapa aparece, mas informa ausência de dados */}
      {pontos.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <div className="bg-surface/80 backdrop-blur-sm border border-surface-border/60 rounded-lg px-3 py-1.5">
            <p className="text-[10px] text-text-muted text-center">
              Sem dados de geolocalização para os filtros atuais.
            </p>
            <p className="text-[9px] text-text-muted/60 text-center mt-0.5">
              Verifique se a tabela LATLONG está populada e o campo IBGE_MUN está preenchido em BI_CLIENTE.
            </p>
          </div>
        </div>
      )}
    </div>
  )
})

// ─── Componente exportado ─────────────────────────────────────────────────────
export const MapaCard = memo(function MapaCard() {
  const { data, isLoading } = useMapaFaturamento()

  const pontos: MapaMunicipio[] = useMemo(
    () => (data ?? []).filter(d => d.lat !== 0 && d.lng !== 0),
    [data],
  )

  return (
    <Card className="flex flex-col h-full">
      <p
        className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-3 shrink-0"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        Distribuição por Município
      </p>

      {isLoading && !pontos.length ? (
        <Skeleton className="flex-1 rounded-xl" style={{ minHeight: 260 }} />
      ) : (
        // FIX: MapaInner agora sempre renderiza — com ou sem pontos
        <MapaInner pontos={pontos} />
      )}
    </Card>
  )
})
