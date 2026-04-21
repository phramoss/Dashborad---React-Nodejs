import { memo, useMemo, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, fmtBRL, fmtNum, fmtInt } from '@/lib/utils'
import { useLazyRows } from '@/hooks/useLazyRows'
import type { SimuladorVendaRow } from '@/types'

interface VendaGrupo {
  material: string
  rows:     SimuladorVendaRow[]
  pc:       number
  qtde:     number
  total:    number
}

function buildVendasGrupos(rows: SimuladorVendaRow[]): VendaGrupo[] {
  const map = new Map<string, VendaGrupo>()
  for (const r of rows) {
    const g = map.get(r.material) ?? { material: r.material, rows: [], pc: 0, qtde: 0, total: 0 }
    g.rows.push(r)
    g.pc    += r.pc
    g.qtde  += r.qtde
    g.total += r.total
    map.set(r.material, g)
  }
  return Array.from(map.values())
}

const VPedidoRow = memo(function VPedidoRow({ r }: { r: SimuladorVendaRow }) {
  const td  = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right text-text-primary whitespace-nowrap'
  const tdL = 'px-2.5 py-1.5 text-[11px] text-left text-text-primary whitespace-nowrap'
  return (
    <tr className="border-b border-[var(--line)] hover:bg-surface-light/20 transition-colors">
      <td className={cn(tdL, 'pl-8 text-text-muted')}>
        <div className="flex items-center gap-1">
          <span className="text-text-muted/30 text-[10px]">└</span>
          <span>{r.nPedido}</span>
        </div>
      </td>
      <td className={cn(td, 'text-text-muted')}>{r.bloco || '—'}</td>
      <td className={td}>{fmtInt(r.pc)}</td>
      <td className={td}>{fmtNum(r.qtde)}</td>
      <td className={cn(td, 'text-status-success font-medium')}>{fmtBRL(r.total)}</td>
      <td className={cn(tdL, 'text-text-muted/70 text-[10px] max-w-[140px] truncate')}>{r.cliente}</td>
    </tr>
  )
})

interface VGrupoRowProps {
  grupo:    VendaGrupo
  isExp:    boolean
  onToggle: (m: string) => void
}

const VGrupoRow = memo(function VGrupoRow({ grupo: g, isExp, onToggle }: VGrupoRowProps) {
  const handleClick = useCallback(() => onToggle(g.material), [g.material, onToggle])
  const tdL = 'px-2.5 py-1.5 text-[11px] text-left text-text-primary whitespace-nowrap'
  const td  = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right text-text-primary whitespace-nowrap'
  return (
    <tr
      className="border-b border-[var(--line)] cursor-pointer select-none bg-surface-light/20 hover:bg-surface-light/60 transition-colors"
      onClick={handleClick}
    >
      <td className={cn(tdL, 'font-semibold')}>
        <div className="flex items-center gap-1.5">
          {isExp ? <ChevronDown size={12} className="text-text-muted shrink-0" /> : <ChevronRight size={12} className="text-text-muted shrink-0" />}
          <span className="truncate">{g.material}</span>
          <span className="text-[9px] text-text-muted/60 shrink-0">({g.rows.length})</span>
        </div>
      </td>
      <td className={cn(td, 'text-text-muted')}>—</td>
      <td className={cn(td, 'font-medium')}>{fmtInt(g.pc)}</td>
      <td className={cn(td, 'font-medium')}>{fmtNum(g.qtde)}</td>
      <td className={cn(td, 'font-medium text-status-success')}>{fmtBRL(g.total)}</td>
      <td className="px-2.5 py-1.5 text-[10px] text-text-muted/60 whitespace-nowrap">{g.rows.length} pedido{g.rows.length !== 1 ? 's' : ''}</td>
    </tr>
  )
})

export interface VendasTableProps {
  rows:       SimuladorVendaRow[]
  loading:    boolean
  maxHeight?: number
}

export const VendasTable = memo(function VendasTable({ rows, loading, maxHeight }: VendasTableProps) {
  const MAX_ROWS = 500
  const limitedRows = useMemo(() => rows.slice(0, MAX_ROWS), [rows])
  const grupos = useMemo(() => buildVendasGrupos(limitedRows), [limitedRows])
  const { totalPC, totalQtde, totalValor } = useMemo(() => ({
    totalPC:    limitedRows.reduce((s, r) => s + r.pc,    0),
    totalQtde:  limitedRows.reduce((s, r) => s + r.qtde,  0),
    totalValor: limitedRows.reduce((s, r) => s + r.total, 0),
  }), [limitedRows])

  const { visible: visibleGrupos, hasMore: hasMoreGrupos, sentinelRef: grupoSentinelRef } = useLazyRows(grupos)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleGrupo = useCallback((material: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(material) ? next.delete(material) : next.add(material)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-1.5 p-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <TrendingUp size={28} className="text-text-muted/40" />
        <p className="text-sm text-text-muted">Sem vendas realizadas</p>
        <p className="text-xs text-text-muted/60">Ajuste os filtros</p>
      </div>
    )
  }

  const thBase = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap'

  return (
    <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: maxHeight ?? 240 }}>
      <table className="min-w-max w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface-light">
          <tr className="border-b border-surface-border">
            <th className={cn(thBase, 'text-left')}>Material / Pedido</th>
            <th className={cn(thBase, 'text-right')}>Bloco</th>
            <th className={cn(thBase, 'text-right')}>PC</th>
            <th className={cn(thBase, 'text-right')}>QTDE</th>
            <th className={cn(thBase, 'text-right')}>Total</th>
            <th className={cn(thBase, 'text-left')}>Cliente</th>
          </tr>
        </thead>
        <tbody>
          {visibleGrupos.map(g => {
            const isExp = expanded.has(g.material)
            return [
              <VGrupoRow key={`g-${g.material}`} grupo={g} isExp={isExp} onToggle={toggleGrupo} />,
              ...(isExp ? g.rows.map(r => (
                <VPedidoRow key={`p-${r.nPedido}-${r.bloco}`} r={r} />
              )) : []),
            ]
          })}
          {hasMoreGrupos && (
            <tr>
              <td colSpan={999}>
                <div ref={grupoSentinelRef} className="h-8 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-brand/40 border-t-brand animate-spin" />
                </div>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="sticky bottom-0 bg-surface-light border-t-2 border-[var(--line)]">
          <tr>
            <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand">TOTAL</td>
            <td />
            <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand text-right tabular-nums">{fmtInt(totalPC)}</td>
            <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand text-right tabular-nums">{fmtNum(totalQtde)}</td>
            <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand text-right tabular-nums">{fmtBRL(totalValor)}</td>
            <td className="px-2.5 py-1.5 text-[11px] text-text-muted">{rows.length} pedido{rows.length !== 1 ? 's' : ''}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
})
