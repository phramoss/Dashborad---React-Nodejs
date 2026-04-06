import { memo, useMemo, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMapaFaturamento } from '@/hooks/useDashboardData'
import { useFiltrosStore, useFilteredUfs, useFilteredMunicipios } from '@/store/filtros.store'
import { formatCurrency } from '@/lib/utils'
import type { MapaMunicipio } from '@/types'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ─── Cores ────────────────────────────────────────────────────
const COLORS = {
  active:         '#00D4AA',
  activeBorder:   '#00FFCC',
  dimmedAlpha:    0.15,
  selectedBorder: '#FFFFFF',
} as const

// ─── Helpers ──────────────────────────────────────────────────

function normalizeRadius(v: number, min: number, max: number): number {
  if (max === min) return 10
  return 6 + ((v - min) / (max - min)) * 24
}

function buildPopupHtml(p: MapaMunicipio, isSelected: boolean): string {
  return `
    <div style="
      font-family:'Roboto',sans-serif;min-width:180px;
      background:#0E1120;color:#c9c9c9;border-radius:10px;padding:12px 16px;
    ">
      <div style="
        font-size:13px;font-weight:700;color:#00D4AA;
        padding-bottom:6px;border-bottom:1px solid #2D3554;margin-bottom:8px;
        display:flex;align-items:center;gap:6px;
      ">
        ${p.municipio} — ${p.uf}
        ${isSelected ? '<span style="font-size:9px;background:#00D4AA22;color:#00FFCC;padding:1px 6px;border-radius:4px;">FILTRADO</span>' : ''}
      </div>
      <div style="font-size:11px;color:#8892B0;">Faturamento</div>
      <div style="font-size:17px;font-weight:700;color:#00FFCC;margin-top:2px;">
        ${formatCurrency(p.faturamento, true)}
      </div>
      <div style="font-size:11px;color:#8892B0;margin-top:6px;">
        ${p.numClientes} cliente${p.numClientes !== 1 ? 's' : ''}
      </div>
      <div style="font-size:9px;color:#8892B055;margin-top:8px;text-align:center;">
        Clique para ${isSelected ? 'remover' : 'filtrar'} ${p.municipio}/${p.uf} em todo o dashboard
      </div>
    </div>`
}

// ─── Mapa Leaflet ─────────────────────────────────────────────
interface MapaInnerProps {
  pontos: MapaMunicipio[]
  activeMunicipios: string[]
  onToggle: (uf: string, municipio: string) => void
}

const MapaInner = memo(function MapaInner({ pontos, activeMunicipios, onToggle }: MapaInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const layerRef     = useRef<L.LayerGroup | null>(null)
  const fittedRef    = useRef(false)

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

    L.control
      .attribution({ position: 'bottomright', prefix: false })
      .addAttribution(
        '© <a href="https://carto.com/">CARTO</a> · © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      )
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
      fittedRef.current = false
    }
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    const map   = mapRef.current
    if (!layer || !map) return

    layer.clearLayers()
    if (!pontos.length) return

    const values    = pontos.map(p => p.faturamento)
    const minV      = Math.min(...values)
    const maxV      = Math.max(...values)
    const munSet    = new Set(activeMunicipios)
    const hasFilter = munSet.size > 0

    pontos.forEach(p => {
      const isSelected = munSet.has(p.municipio)
      const isActive   = !hasFilter || isSelected
      const baseRadius = normalizeRadius(p.faturamento, minV, maxV)
      const radius     = isSelected ? baseRadius + 2 : baseRadius

      const circle = L.circleMarker([p.lat, p.lng], {
        radius,
        fillColor:   COLORS.active,
        fillOpacity: isActive ? 0.65 : COLORS.dimmedAlpha,
        color:       isSelected ? COLORS.selectedBorder : COLORS.activeBorder,
        weight:      isSelected ? 2.5 : 1.5,
        opacity:     isActive ? 0.8 : 0.25,
      })

      circle.bindPopup(buildPopupHtml(p, isSelected), {
        className: 'leaflet-popup-dark',
        closeButton: true,
        maxWidth: 280,
      })

      circle.on('click', () => onToggle(p.uf, p.municipio))

      circle.on('mouseover', function (this: L.CircleMarker) {
        this.setStyle({ fillOpacity: 0.95, weight: 3 })
        this.setRadius(radius + 3)
      })
      circle.on('mouseout', function (this: L.CircleMarker) {
        this.setStyle({
          fillOpacity: isActive ? 0.65 : COLORS.dimmedAlpha,
          weight: isSelected ? 2.5 : 1.5,
        })
        this.setRadius(radius)
      })

      layer.addLayer(circle)
    })

    if (!fittedRef.current && pontos.length > 0) {
      const bounds = L.latLngBounds(pontos.map(p => [p.lat, p.lng] as L.LatLngTuple))
      map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2, maxZoom: 7 })
      fittedRef.current = true
    }
  }, [pontos, activeMunicipios, onToggle])

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: 280 }}
      />

      {pontos.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none z-[1000]">
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

// ─── Badges ───────────────────────────────────────────────────
function MapaBadges({
  activeMunicipios,
  pontos,
  onToggle,
  onClear,
}: {
  activeMunicipios: string[]
  pontos: MapaMunicipio[]
  onToggle: (uf: string, municipio: string) => void
  onClear: () => void
}) {
  if (activeMunicipios.length === 0) return null

  const munSet = new Set(activeMunicipios)
  const items = pontos.filter(p => munSet.has(p.municipio))

  // Deduplica por municipio (pode ter mesmo município repetido em pontos diferentes)
  const seen = new Set<string>()
  const unique = items.filter(p => {
    const key = `${p.municipio}|${p.uf}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 shrink-0">
      {unique.map(p => (
        <button
          key={`${p.municipio}|${p.uf}`}
          onClick={() => onToggle(p.uf, p.municipio)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium
                     bg-brand/15 text-brand border border-brand/25
                     hover:bg-brand/25 hover:border-brand/40 transition-all"
        >
          {p.municipio} — {p.uf}
          <span className="text-brand/60 hover:text-brand ml-0.5">✕</span>
        </button>
      ))}
      {unique.length > 1 && (
        <button
          onClick={onClear}
          className="px-2 py-0.5 rounded-md text-[9px] font-medium
                     text-status-danger/70 hover:text-status-danger
                     bg-status-danger/5 hover:bg-status-danger/10
                     border border-status-danger/15 hover:border-status-danger/30
                     transition-all"
        >
          Limpar todos
        </button>
      )}
    </div>
  )
}

// ─── Componente exportado ─────────────────────────────────────
export const MapaCard = memo(function MapaCard() {
  const { data, isLoading }  = useMapaFaturamento()
  const activeMunicipios     = useFilteredMunicipios()
  const toggleMapaLocal      = useFiltrosStore(s => s.toggleMapaLocal)
  const clearMapaFilter      = useFiltrosStore(s => s.clearMapaFilter)

  const pontos: MapaMunicipio[] = useMemo(
    () => (data ?? []).filter(d => d.lat !== 0 && d.lng !== 0),
    [data],
  )

  const handleToggle = useCallback((uf: string, municipio: string) => {
    toggleMapaLocal(uf, municipio)
  }, [toggleMapaLocal])

  const handleClear = useCallback(() => {
    clearMapaFilter()
  }, [clearMapaFilter])

  // Resumo
  const summary = useMemo(() => {
    if (activeMunicipios.length === 0) return null
    const munSet = new Set(activeMunicipios)
    const filtered = pontos.filter(p => munSet.has(p.municipio))
    const totalFat = filtered.reduce((s, p) => s + p.faturamento, 0)
    const totalCli = filtered.reduce((s, p) => s + p.numClientes, 0)
    return { totalFat, totalCli, count: filtered.length }
  }, [pontos, activeMunicipios])

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <p
          className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          Faturamento por Município
        </p>

        {summary && (
          <div className="flex items-center gap-3 text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>
            <span className="text-text-muted">
              {summary.count} município{summary.count !== 1 ? 's' : ''}
            </span>
            <span className="font-bold text-brand">
              {formatCurrency(summary.totalFat, true)}
            </span>
            <span className="text-text-muted">
              {summary.totalCli} cliente{summary.totalCli !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {isLoading && !pontos.length ? (
        <Skeleton className="flex-1 rounded-xl" style={{ minHeight: 280 }} />
      ) : (
        <MapaInner
          pontos={pontos}
          activeMunicipios={activeMunicipios}
          onToggle={handleToggle}
        />
      )}

      <MapaBadges
        activeMunicipios={activeMunicipios}
        pontos={pontos}
        onToggle={handleToggle}
        onClear={handleClear}
      />
    </Card>
  )
})