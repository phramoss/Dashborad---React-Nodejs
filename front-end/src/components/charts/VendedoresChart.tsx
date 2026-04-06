import { memo, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFaturamentoVendedor } from '@/hooks/useDashboardData'
import { useFiltrosStore, useFilteredVendedores } from '@/store/filtros.store'
import type { FaturamentoVendedor } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'

// ─── Card individual de vendedor ─────────────────────────────────────────────
function VendedorCard({
  v, rank, pct, isActive, isDimmed, onToggle,
}: {
  v: FaturamentoVendedor; rank: number; pct: number
  isActive: boolean; isDimmed: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left w-full',
        'border transition-colors duration-200',
        isDimmed
          ? 'bg-surface-dark/40 border-transparent opacity-40'
          : 'bg-surface-dark/60 border-surface-border/50',
      )}
    >
      {/* Badge de ranking */}
      <div className={cn(
        'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold',
        rank === 1 ? 'bg-chart-yellow/20 text-chart-yellow' :
        rank === 2 ? 'bg-text-muted/20 text-text-muted' :
        rank === 3 ? 'bg-chart-orange/20 text-chart-orange' :
        'bg-surface-light text-text-muted',
      )}>
        {rank}
      </div>

      {/* Conteúdo — nome + valor + barra */}
      <div className="flex-1 min-w-0">
        {/* Linha 1: nome (dá espaço para pelo menos 14-16 chars) */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-medium truncate transition-colors text-text-primary">
            {v.vendedorNome}
          </span>
          <span
            className="shrink-0 tabular-nums text-[11px]"
            style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 600, color: '#8892B0' }}
          >
            {formatCurrency(v.faturamento, true)}
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="h-[3px] bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: isDimmed ? '#2D3554' : 'linear-gradient(90deg, #00D4AA, #00FFCC)',
              boxShadow: 'none',
            }}
          />
        </div>
      </div>

      {/* Percentual */}
      <span
        className="shrink-0 tabular-nums text-right"
        style={{ fontSize: '11px', minWidth: '38px', fontFamily: 'Roboto, sans-serif', fontWeight: 600, color: '#8892B0' }}
      >
        {pct.toFixed(1)}%
      </span>
    </button>
  )
}

// ─── Lista de vendedores ──────────────────────────────────────────────────────
const VendedoresList = memo(function VendedoresList() {
  const { data, isLoading } = useFaturamentoVendedor()
  const activeVendedores = useFilteredVendedores()
  const toggleVendedor = useFiltrosStore(s => s.toggleVendedor)

  const { sortedData, total } = useMemo(() => {
    const arr = (data ?? []) as FaturamentoVendedor[]
    const sorted = [...arr].sort((a, b) => b.faturamento - a.faturamento)
    const t = sorted.reduce((s, d) => s + d.faturamento, 0)
    return { sortedData: sorted, total: t }
  }, [data])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!sortedData.length) return <EmptyState />

  return (

    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 auto-rows-min content-start overflow-y-auto pr-0.5"
      style={{ maxHeight: 360 }}
    >
      {sortedData.map((v, idx) => {
        const rank     = idx + 1
        const pct      = total > 0 ? (v.faturamento / total) * 100 : 0
        const isActive = activeVendedores.length === 0 || activeVendedores.includes(v.vendedorId)
        const isDimmed = !isActive
        return (
          <VendedorCard
            key={v.vendedorId}
            v={v} rank={rank} pct={pct}
            isActive={isActive} isDimmed={isDimmed}
            onToggle={() => toggleVendedor(v.vendedorId)}
          />
        )
      })}
    </div>
  )
})

// ─── Componente exportado ─────────────────────────────────────────────────────
export const VendedoresChart = memo(function VendedoresChart() {
  const activeVendedoresOuter = useFilteredVendedores()

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <p
          className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          Faturamento por Vendedor
        </p>
        {activeVendedoresOuter.length > 0 && (
          <button
            onClick={() => useFiltrosStore.getState().resetFiltro('vendedores')}
            className="text-[9px] text-status-danger/70 hover:text-status-danger transition-colors"
          >
            limpar
          </button>
        )}
      </div>

      <VendedoresList />
    </Card>
  )
})
