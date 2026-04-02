import { memo, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFaturamentoVendedor } from '@/hooks/useDashboardData'
import { useFiltrosStore, useHover } from '@/store/filtros.store'
import type { FaturamentoVendedor } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'

const CARD_HEIGHT_PX = 52
const MOBILE_VISIBLE = 5

function VendedorCard({
  v, idx, pct, isActive, isHovered, isDimmed, onToggle, onEnter, onLeave,
}: {
  v: FaturamentoVendedor; idx: number; pct: number
  isActive: boolean; isHovered: boolean; isDimmed: boolean
  onToggle: () => void; onEnter: () => void; onLeave: () => void
}) {
  return (
    <button
      onClick={onToggle}
      onMouseEnter={onEnter}
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
        idx === 0 ? 'bg-chart-yellow/20 text-chart-yellow' :
        idx === 1 ? 'bg-text-muted/20 text-text-muted' :
        idx === 2 ? 'bg-chart-orange/20 text-chart-orange' :
        'bg-surface-light text-text-muted',
      )}>
        {idx + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={cn(
            'text-xs font-medium truncate transition-colors',
            isHovered ? 'text-brand' : 'text-text-primary group-hover:text-brand',
          )}>
            {v.vendedorNome}
          </span>
          {/* Faturamento: Roboto, +20% (base 10px → 12px) */}
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

      {/* Percentagem: Roboto, +20% (base 10px → 12px) */}
      <span className="w-9 text-right shrink-0" style={{ fontSize: '12px', fontFamily: 'Roboto, sans-serif', fontWeight: 600, color: '#8892B0' }}>
        {pct.toFixed(1)}%
      </span>
    </button>
  )
}

export const VendedoresTable = memo(function VendedoresTable() {
  const { data, isLoading } = useFaturamentoVendedor()
  const { filtros, toggleVendedor, setHover, clearHover } = useFiltrosStore()
  const hover = useHover()

  const total = (data ?? []).reduce((s: number, d: FaturamentoVendedor) => s + d.faturamento, 0)
  const isHoveredFromOther = hover.dimension !== null && hover.dimension !== 'vendedor'

  const handleMouseEnter = useCallback((id: number) => {
    setHover({ dimension: 'vendedor', id })
  }, [setHover])

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest" style={{ fontFamily: 'Roboto, sans-serif' }}>
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

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* MOBILE (< sm): 5 visíveis + scroll */}
          <div
            className="flex flex-col gap-1.5 sm:hidden overflow-y-auto pr-1"
            style={{ maxHeight: `${MOBILE_VISIBLE * CARD_HEIGHT_PX + (MOBILE_VISIBLE - 1) * 6}px` }}
          >
            {data.map((v: FaturamentoVendedor, idx: number) => {
              const pct      = total > 0 ? (v.faturamento / total) * 100 : 0
              const isActive = filtros.vendedores.length === 0 || filtros.vendedores.includes(v.vendedorId)
              const isHovrd  = hover.dimension === 'vendedor' && hover.id === v.vendedorId
              const isDimmed = !isActive || (isHoveredFromOther && !isHovrd)
              return (
                <VendedorCard
                  key={v.vendedorId}
                  v={v} idx={idx} pct={pct}
                  isActive={isActive} isHovered={isHovrd} isDimmed={isDimmed}
                  onToggle={() => toggleVendedor(v.vendedorId)}
                  onEnter={() => handleMouseEnter(v.vendedorId)}
                  onLeave={() => clearHover()}
                />
              )
            })}
          </div>

          {/* DESKTOP (>= sm): grid completo sem restrição de altura */}
          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
            {data.map((v: FaturamentoVendedor, idx: number) => {
              const pct      = total > 0 ? (v.faturamento / total) * 100 : 0
              const isActive = filtros.vendedores.length === 0 || filtros.vendedores.includes(v.vendedorId)
              const isHovrd  = hover.dimension === 'vendedor' && hover.id === v.vendedorId
              const isDimmed = !isActive || (isHoveredFromOther && !isHovrd)
              return (
                <VendedorCard
                  key={v.vendedorId}
                  v={v} idx={idx} pct={pct}
                  isActive={isActive} isHovered={isHovrd} isDimmed={isDimmed}
                  onToggle={() => toggleVendedor(v.vendedorId)}
                  onEnter={() => handleMouseEnter(v.vendedorId)}
                  onLeave={() => clearHover()}
                />
              )
            })}
          </div>
        </>
      )}
    </Card>
  )
})
