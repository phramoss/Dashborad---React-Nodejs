import { memo, useMemo, useEffect, useRef } from 'react'
import { useMapaFaturamento } from '@/hooks/useDashboardData'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import type { MapaMunicipio } from '@/types'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function normalizeRadius(v: number, min: number, max: number): number {
  if (max === min) return 10
  return 6 + ((v - min) / (max - min)) * 24
}

function buildPopupHtml(p: MapaMunicipio): string {
  const s = getComputedStyle(document.documentElement)
  const bg      = s.getPropertyValue('--surface').trim() || '#2D2F33'
  const textPri = s.getPropertyValue('--text-primary').trim() || '#c9c9c9'
  const textMut = s.getPropertyValue('--text-muted').trim() || '#8892B0'
  const brand   = s.getPropertyValue('--brand').trim() || '#428D94'
  const border  = s.getPropertyValue('--border').trim() || 'rgba(66,141,148,0.20)'

  return `
    <div style="
      font-family:'Roboto',sans-serif;min-width:180px;
      background:${bg};color:${textPri};border-radius:10px;padding:12px 16px;
    ">
      <div style="font-size:13px;font-weight:700;color:${brand};
        padding-bottom:6px;border-bottom:1px solid ${border};margin-bottom:8px;">
        ${p.municipio} — ${p.uf}
      </div>
      <div style="font-size:11px;color:${textMut};">Faturamento</div>
      <div style="font-size:17px;font-weight:700;color:${brand};margin-top:2px;">
        ${formatCurrency(p.faturamento, true)}
      </div>
      <div style="font-size:11px;color:${textMut};margin-top:6px;">
        ${p.numClientes} cliente${p.numClientes !== 1 ? 's' : ''}
      </div>
    </div>`
}

export const MapaFaturamento = memo(function MapaFaturamento() {
  const { data, isLoading } = useMapaFaturamento()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const layerRef     = useRef<L.LayerGroup | null>(null)

  const pontos: MapaMunicipio[] = useMemo(() => {
    if (!data) return []
    return data.filter(d => d.lat !== 0 && d.lng !== 0)
  }, [data])

  // Inicializa mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [-14.5, -51],
      zoom: 4,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
    })

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19 },
    ).addTo(map)

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© <a href="https://carto.com/">CARTO</a> · © <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  // Atualiza marcadores
  useEffect(() => {
    const layer = layerRef.current
    const map   = mapRef.current
    if (!layer || !map) return

    layer.clearLayers()
    if (!pontos.length) return

    const values = pontos.map(p => p.faturamento)
    const minV = Math.min(...values)
    const maxV = Math.max(...values)

    pontos.forEach(p => {
      const radius = normalizeRadius(p.faturamento, minV, maxV)

      const circle = L.circleMarker([p.lat, p.lng], {
        radius,
        fillColor: '#428D94',
        fillOpacity: 0.6,
        color: '#5AB5BC',
        weight: 1.5,
        opacity: 0.8,
      })

      circle.bindPopup(buildPopupHtml(p), {
        className: 'leaflet-popup-dark',
        closeButton: true,
        maxWidth: 280,
      })

      circle.on('mouseover', function (this: L.CircleMarker) {
        this.setStyle({ fillOpacity: 0.95, weight: 2.5 })
        this.setRadius(radius + 3)
      })
      circle.on('mouseout', function (this: L.CircleMarker) {
        this.setStyle({ fillOpacity: 0.6, weight: 1.5 })
        this.setRadius(radius)
      })

      layer.addLayer(circle)
    })

    const bounds = L.latLngBounds(pontos.map(p => [p.lat, p.lng] as L.LatLngTuple))
    map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2, maxZoom: 7 })
  }, [pontos])

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
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full rounded-lg overflow-hidden"
        style={{ minHeight: 220 }}
      />
    </div>
  )
})
