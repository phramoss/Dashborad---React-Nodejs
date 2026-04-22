import { memo, useMemo, useState, useCallback } from 'react'
import { ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, fmtNum, fmtInt, formatCurrency, formatDate } from '@/lib/utils'
import type { BVMaterialComprado } from '@/types'

const fmtCur = (v: number) => formatCurrency(v)

export interface BVMateriaisCompradosProps {
  data?:    BVMaterialComprado[]
  loading?: boolean
}

export const BVMateriaisComprados = memo(function BVMateriaisComprados({
  data, loading,
}: BVMateriaisCompradosProps) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  const handleSort = useCallback((col: string) => {
    setSortCol(prev => {
      if (prev === col) {
        setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')
        return col
      }
      setSortDir('asc')
      return col
    })
  }, [])

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <span className="inline-block w-2.5" />
    if (sortDir === 'asc')  return <ChevronUp   size={9} className="inline-block text-brand" />
    if (sortDir === 'desc') return <ChevronDown  size={9} className="inline-block text-brand" />
    return <span className="inline-block w-2.5" />
  }

  const rawRows = data ?? []

  const rows = useMemo(() => {
    if (!sortCol || !sortDir) return rawRows
    return [...rawRows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortCol === 'material')      return dir * a.material.localeCompare(b.material)
      if (sortCol === 'ultimaVenda')   return dir * (a.ultimaVenda ?? '').localeCompare(b.ultimaVenda ?? '')
      if (sortCol === 'qtdeM2')        return dir * (a.qtdeM2 - b.qtdeM2)
      if (sortCol === 'qtdeM3')        return dir * (a.qtdeM3 - b.qtdeM3)
      if (sortCol === 'qtdePc')        return dir * (a.qtdePc - b.qtdePc)
      if (sortCol === 'numPedidos')    return dir * (a.numPedidos - b.numPedidos)
      if (sortCol === 'totalFaturado') return dir * (a.totalFaturado - b.totalFaturado)
      return 0
    })
  }, [rawRows, sortCol, sortDir])

  const hBtn = (col: string, label: string, right = false) => (
    <button type="button" onClick={() => handleSort(col)}
      className={cn(
        'flex items-center gap-0.5 text-[10px] text-text-muted uppercase tracking-wider hover:text-text-secondary',
        right ? 'justify-end' : '',
      )}>
      {right && <SortIcon col={col} />}
      {label}
      {!right && <SortIcon col={col} />}
    </button>
  )

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag size={12} className="text-brand" />
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Materiais Comprados</p>
        </div>
      </div>

      <div
        className="grid px-3 py-1.5 bg-surface-light border-b border-surface-border shrink-0"
        style={{ gridTemplateColumns: '1fr 96px 72px 72px 52px 52px 108px' }}
      >
        <span className="pl-1">{hBtn('material', 'Material')}</span>
        <span className="text-right pr-2">{hBtn('ultimaVenda', 'Última Venda', true)}</span>
        <span className="text-right pr-2">{hBtn('qtdeM2', 'M²', true)}</span>
        <span className="text-right pr-2">{hBtn('qtdeM3', 'M³', true)}</span>
        <span className="text-right pr-2">{hBtn('qtdePc', 'PC', true)}</span>
        <span className="text-right pr-2">{hBtn('numPedidos', 'Pedidos', true)}</span>
        <span className="text-right pr-1">{hBtn('totalFaturado', 'Total Faturado', true)}</span>
      </div>

      <div className="overflow-y-auto flex-1" style={{ maxHeight: 320 }}>
        {loading ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[11px] text-text-muted">Sem dados</p>
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={row.materialId}
              className={cn(
                'grid border-b border-surface-border/30 hover:bg-surface-light/40 transition-colors',
                idx % 2 === 1 && 'bg-surface-light/15',
              )}
              style={{ gridTemplateColumns: '1fr 96px 72px 72px 52px 52px 108px' }}
            >
              <span className="text-[11px] text-text-secondary truncate pl-3 py-1.5 pr-1" title={row.material}>
                {row.material}
              </span>
              <span className="text-[11px] text-text-muted tabular-nums text-right self-center pr-2">
                {row.ultimaVenda ? formatDate(row.ultimaVenda) : '—'}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {row.qtdeM2 > 0 ? fmtNum(row.qtdeM2) : '—'}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {row.qtdeM3 > 0 ? fmtNum(row.qtdeM3) : '—'}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {fmtInt(row.qtdePc)}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {fmtInt(row.numPedidos)}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-1">
                {fmtCur(row.totalFaturado)}
              </span>
            </div>
          ))
        )}
      </div>

      {!loading && rows.length > 0 && (
        <div
          className="grid px-3 py-1.5 bg-surface-light border-t border-surface-border shrink-0"
          style={{ gridTemplateColumns: '1fr 96px 72px 72px 52px 52px 108px' }}
        >
          <span className="text-[11px] font-semibold text-text-secondary pl-1">Total</span>
          <span />
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtNum(rows.reduce((s, r) => s + r.qtdeM2, 0))}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtNum(rows.reduce((s, r) => s + r.qtdeM3, 0))}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtInt(rows.reduce((s, r) => s + r.qtdePc, 0))}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtInt(rows.reduce((s, r) => s + r.numPedidos, 0))}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-1">
            {fmtCur(rows.reduce((s, r) => s + r.totalFaturado, 0))}
          </span>
        </div>
      )}
    </Card>
  )
})
