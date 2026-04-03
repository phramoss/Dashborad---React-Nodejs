/**
 * VendedoresTable.tsx — versão otimizada
 *
 * Correções:
 * 1. BUG CRÍTICO: VendedoresListDesktop estava sem `const` → ReferenceError
 * 2. PERFORMANCE: useVendedoresData() chamado 2x → 2 subscriptions ao store.
 *    Agora dados são buscados UMA VEZ em VendedoresContent e passados via props.
 * 3. PERFORMANCE: handlers inline por item substituídos por handlers estáveis
 *    que recebem o id como argumento.
 */

import { memo, useCallback, useMemo, lazy, Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFaturamentoVendedor } from '@/hooks/useDashboardData'
import { useFiltrosStore, useHover } from '@/store/filtros.store'
import type { FaturamentoVendedor } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'

const MapaFaturamento = lazy(() =>
  import('./MapaFaturamento').then(m => ({ default: m.MapaFaturamento }))
)

const CARD_HEIGHT_PX = 52
const MOBILE_VISIBLE = 5

// ─── Props dos sub-componentes de lista ──────────────────────────────────────
interface VendedoresListProps {
  sortedData: FaturamentoVendedor[]
  total: number
  activeIds: number[]
  hoverId: number | string | null
  hoverDimension: string | null
  onToggle: (id: number) => void
  onEnter: (id: number) => void
  onLeave: () => void
  isLoading: boolean
}

// ─── Card individual de vendedor ────────────────────────────────────────────
interface VendedorCardProps {
  v: FaturamentoVendedor
  rank: number
  pct: number
  isActive: boolean
  isHovered: boolean
  isDimmed: boolean
  onToggle: (id: number) => void
  onEnter: (id: number) => void
  onLeave: () => void
}

const VendedorCard = memo(function VendedorCard({
  v, rank, pct, isActive, isHovered, isDimmed, onToggle, onEnter, onLeave,
}: VendedorCardProps) {
  return (
    <button
      onClick={() => onToggle(v.vendedorId)}
      onMouseEnter={() => onEnter(v.vendedorId)}
      onMouseLeave={onLeave}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full',
        'border transition-all duration-200 group',
        isHovered
          ? 'bg-brand/8 border-brand/30 scale-[1.01]'
          : isDimmed
          ? 'bg-surface-dark/40 border-transparent opacity-40'
          : 'bg-surface-dark/60 border-surface-border/50 hover:border-brand/20 hover:bg-surface-light/50',
        isActive && !isDimmed && 'border-brand/40 bg-brand/5',
      )}
    >
      <div className={cn(
        'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold',
        rank === 1 ? 'bg-chart-yellow/20 text-chart-yellow' :
        rank === 2 ? 'bg-text-muted/20 text-text-muted' :
        rank === 3 ? 'bg-chart-orange/20 text-chart-orange' :
        'bg-surface-light text-text-muted',
      )}>
        {rank}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={cn(
            'text-xs font-medium truncate transition-colors',
            isHovered ? 'text-brand' : 'text-text-primary group-hover:text-brand',
          )}>
            {v.vendedorNome}
          </span>
          <span className="shrink-0" style={{ fontSize: '12px', fontFamily: 'Roboto, sans-serif', fontWeight: 600, color: '#8892B0' }}>
            {formatCurrency(v.faturamento, true)}
          </span>
        </div>
        <div className="h-[3px] bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: isDimmed ? '#2D3554' : 'linear-gradient(90deg, #00D4AA, #00FFCC)',
              boxShadow: isHovered ? '0 0 6px #00D4AA80' : 'none',
            }}
          />
        </div>
      </div>

      <span className="w-9 text-right shrink-0" style={{ fontSize: '12px', fontFamily: 'Roboto, sans-serif', fontWeight: 600, color: '#8892B0' }}>
        {pct.toFixed(1)}%
      </span>
    </button>
  )
})

// ─── Modo mobile ─────────────────────────────────────────────────────────────
const VendedoresListMobile = memo(function VendedoresListMobile({
  sortedData, total, activeIds, hoverId, hoverDimension,
  onToggle, onEnter, onLeave, isLoading,
}: VendedoresListProps) {
  const isHoveredFromOther = hoverDimension !== null && hoverDimension !== 'vendedor'

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }
  if (!sortedData.length) return <EmptyState />

  return (
    <div
      className="flex flex-col gap-1.5 overflow-y-auto pr-1"
      style={{ maxHeight: `${MOBILE_VISIBLE * CARD_HEIGHT_PX + (MOBILE_VISIBLE - 1) * 6}px` }}
    >
      {sortedData.map((v, idx) => {
        const rank     = idx + 1
        const pct      = total > 0 ? (v.faturamento / total) * 100 : 0
        const isActive = activeIds.length === 0 || activeIds.includes(v.vendedorId)
        const isHovrd  = hoverDimension === 'vendedor' && hoverId === v.vendedorId
        const isDimmed = !isActive || (isHoveredFromOther && !isHovrd)
        return (
          <VendedorCard
            key={v.vendedorId}
            v={v} rank={rank} pct={pct}
            isActive={isActive} isHovered={isHovrd} isDimmed={isDimmed}
            onToggle={onToggle} onEnter={onEnter} onLeave={onLeave}
          />
        )
      })}
    </div>
  )
})

// ─── Modo desktop ─────────────────────────────────────────────────────────────
const VendedoresListDesktop = memo(function VendedoresListDesktop({
  sortedData, total, activeIds, hoverId, hoverDimension,
  onToggle, onEnter, onLeave, isLoading,
}: VendedoresListProps) {
  const isHoveredFromOther = hoverDimension !== null && hoverDimension !== 'vendedor'

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </>
    )
  }
  if (!sortedData.length) return <EmptyState />

  return (
    <>
      {sortedData.map((v, idx) => {
        const rank     = idx + 1
        const pct      = total > 0 ? (v.faturamento / total) * 100 : 0
        const isActive = activeIds.length === 0 || activeIds.includes(v.vendedorId)
        const isHovrd  = hoverDimension === 'vendedor' && hoverId === v.vendedorId
        const isDimmed = !isActive || (isHoveredFromOther && !isHovrd)
        return (
          <VendedorCard
            key={v.vendedorId}
            v={v} rank={rank} pct={pct}
            isActive={isActive} isHovered={isHovrd} isDimmed={isDimmed}
            onToggle={onToggle} onEnter={onEnter} onLeave={onLeave}
          />
        )
      })}
    </>
  )
})

// ─── Conteúdo: única fonte de dados ─────────────────────────────────────────
// FIX: dados buscados UMA VEZ aqui e passados via props para Mobile/Desktop.
// Antes: hook chamado em cada sub-componente = 2 subscriptions ao store.
const VendedoresContent = memo(function VendedoresContent() {
  const { data, isLoading } = useFaturamentoVendedor()
  const { filtros, toggleVendedor, setHover, clearHover } = useFiltrosStore()
  const hover = useHover()

  const { sortedData, total } = useMemo(() => {
    const arr    = (data ?? []) as FaturamentoVendedor[]
    const sorted = [...arr].sort((a, b) => b.faturamento - a.faturamento)
    const t      = sorted.reduce((s, d) => s + d.faturamento, 0)
    return { sortedData: sorted, total: t }
  }, [data])

  // Handlers estáveis — recebem id como argumento, não criam closure por item
  const handleToggle = useCallback((id: number) => {
    toggleVendedor(id)
  }, [toggleVendedor])

  const handleEnter = useCallback((id: number) => {
    setHover({ dimension: 'vendedor', id })
  }, [setHover])

  const sharedProps: VendedoresListProps = {
    sortedData,
    total,
    activeIds:      filtros.vendedores,
    hoverId:        hover.id,
    hoverDimension: hover.dimension,
    onToggle:       handleToggle,
    onEnter:        handleEnter,
    onLeave:        clearHover,
    isLoading,
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">

      {/* ── Lista de vendedores ──────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="sm:hidden">
          <VendedoresListMobile {...sharedProps} />
        </div>
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 auto-rows-min content-start">
          <VendedoresListDesktop {...sharedProps} />
        </div>
      </div>

      {/* ── Mapa — só desktop ────────────────────────────────── */}
      <div
        className="hidden sm:block sm:w-[360px] lg:w-[420px] xl:w-[480px] shrink-0"
        style={{ minHeight: 280 }}
      >
        <Suspense fallback={<Skeleton className="w-full h-full rounded-xl" style={{ minHeight: 280 }} />}>
          <MapaFaturamento />
        </Suspense>
      </div>
    </div>
  )
})

// ─── Container principal ─────────────────────────────────────────────────────
export const VendedoresTable = memo(function VendedoresTable() {
  const { filtros } = useFiltrosStore()

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <p
          className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          Faturamento por Vendedor
        </p>
        {filtros.vendedores.length > 0 && (
          <button
            onClick={() => useFiltrosStore.getState().resetFiltro('vendedores')}
            className="text-[9px] text-status-danger/70 hover:text-status-danger transition-colors"
          >
            limpar
          </button>
        )}
      </div>

      <VendedoresContent />
    </Card>
  )
})
