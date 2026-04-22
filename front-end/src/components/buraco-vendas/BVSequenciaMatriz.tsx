import { memo, useMemo, useState, useCallback, useEffect, Fragment } from 'react'
import { Activity, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatCurrency, MESES_ABREV } from '@/lib/utils'
import { useLazyRows } from '@/hooks/useLazyRows'
import { useBVSequenciaChildren } from '@/hooks/useBuracoVendasData'
import type { BuracoVendasFiltros, EstoqueMatrizResult, EstoqueDrillState, MatrizSort } from '@/types'
import {
  buildRowKey, buildChildDrill, SEQ_FIELDS, isBVSeqRowActive, applyBVSeqFilter,
} from './bv-helpers'

const fmtCur = (v: number) => formatCurrency(v)

interface BVSeqInlineRowsProps {
  parentDrill:    EstoqueDrillState
  periodos:       string[]
  depth:          number
  expandedKeys:   Set<string>
  onToggleExpand: (key: string) => void
  filtros:        BuracoVendasFiltros
  onFilter:       (p: Partial<BuracoVendasFiltros>) => void
  COL_DIM:        number
}

function BVSeqInlineRows({
  parentDrill, periodos, depth, filtros, COL_DIM,
}: BVSeqInlineRowsProps) {
  const { data, isLoading } = useBVSequenciaChildren(parentDrill)
  const currentLevel = parentDrill.nivel
  const rows         = data?.rows ?? []
  const currentField = SEQ_FIELDS[currentLevel]

  const { itemMap, pivot } = useMemo(() => {
    const im = new Map<string, string>()
    rows.forEach(r => { if (!im.has(String(r.value))) im.set(String(r.value), r.label) })
    const pv: Record<string, Record<string, number>> = {}
    rows.forEach(r => {
      const pk = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      const ik = String(r.value)
      if (!pv[ik]) pv[ik] = {}
      pv[ik][pk] = r.total
    })
    return { itemMap: im, pivot: pv }
  }, [rows])

  if (isLoading) {
    return (
      <tr>
        <td colSpan={2 + periodos.length}>
          <div className="px-3 py-1.5" style={{ paddingLeft: 12 + depth * 14 }}>
            <Skeleton className="h-4 w-full" />
          </div>
        </td>
      </tr>
    )
  }

  if (!itemMap.size) return null

  return (
    <>
      {Array.from(itemMap.entries()).map(([value, label]) => {
        const key        = buildRowKey(parentDrill.path, currentLevel, value)
        const isSelected = isBVSeqRowActive(currentField, value, filtros)

        return (
          <tr
            key={key}
            className={cn(
              'border-b border-surface-border/30 hover:bg-surface-light/40 transition-colors',
              isSelected && 'bg-brand/10',
            )}
          >
            <td
              colSpan={2}
              className={cn('sticky z-[5] bg-surface border-r border-surface-border', isSelected && 'border-l-2 border-l-brand')}
              style={{ maxWidth: COL_DIM + 24, paddingLeft: 4 + depth * 14, left: 0 }}
            >
              <div className="flex items-center gap-1 min-w-0 py-1">
                <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 block" />
                </span>
                <span
                  className={cn(
                    'flex-1 text-[11px] truncate pr-2',
                    isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                  )}
                  title={label}
                >
                  {label}
                </span>
              </div>
            </td>
            {periodos.map(p => {
              const total = pivot[value]?.[p]
              return (
                <td
                  key={p}
                  className={cn(
                    'px-2 py-1 text-right tabular-nums text-[11px] border-r border-surface-border/30',
                    total ? 'text-text-primary' : 'text-status-danger/25',
                  )}
                >
                  {total ? fmtCur(total) : '—'}
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}

export interface BVSequenciaMatrizProps {
  data?:         EstoqueMatrizResult
  loading?:      boolean
  filtros:       BuracoVendasFiltros
  onFilter:      (p: Partial<BuracoVendasFiltros>) => void
  onSortChange?: (sort: MatrizSort) => void
}

export const BVSequenciaMatriz = memo(function BVSequenciaMatriz({
  data, loading, filtros, onFilter, onSortChange,
}: BVSequenciaMatrizProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  useEffect(() => {
    onSortChange?.({ col: sortCol, dir: sortDir })
  }, [sortCol, sortDir, onSortChange])

  const handleSort = useCallback((col: string) => {
    setSortCol(prev => {
      if (prev !== col) { setSortDir('asc'); return col }
      setSortDir(d => {
        if (d === 'asc') return 'desc'
        setSortCol(null)
        return null
      })
      return prev
    })
  }, [])

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const rows     = data?.rows ?? []
  const maxNivel = data?.maxNivel ?? 1

  const { periodos, items, pivot, totaisPeriodo } = useMemo(() => {
    if (!rows.length) return {
      periodos:      [] as string[],
      items:         [] as { value: string; label: string; campoAdicional: string; limite: number | undefined }[],
      pivot:         {} as Record<string, Record<string, number>>,
      totaisPeriodo: {} as Record<string, number>,
    }

    const periodSet = new Set<string>()
    rows.forEach(r => periodSet.add(`${r.ano}-${String(r.mes).padStart(2, '0')}`))
    const periodos = Array.from(periodSet).sort()

    const itemMap   = new Map<string, string>()
    const extraMap  = new Map<string, string>()
    const limiteMap = new Map<string, number | undefined>()
    rows.forEach(r => {
      const k = String(r.value)
      if (!itemMap.has(k)) {
        itemMap.set(k, r.label)
        extraMap.set(k, r.campoAdicional ?? '')
        limiteMap.set(k, r.limite)
      }
    })
    const items = Array.from(itemMap.entries()).map(([value, label]) => ({
      value, label, campoAdicional: extraMap.get(value) ?? '', limite: limiteMap.get(value),
    }))

    const pivot: Record<string, Record<string, number>> = {}
    const totaisPeriodo: Record<string, number> = {}
    rows.forEach(r => {
      const pk = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      const ik = String(r.value)
      if (!pivot[ik]) pivot[ik] = {}
      pivot[ik][pk] = r.total
      totaisPeriodo[pk] = (totaisPeriodo[pk] ?? 0) + r.total
    })

    return { periodos, items, pivot, totaisPeriodo }
  }, [rows])

  const periodoLabel = (key: string) => {
    const [ano, mes] = key.split('-')
    return `${MESES_ABREV[Number(mes) - 1] ?? mes}/${ano?.slice(2)}`
  }

  const { visible: visibleSeqItems, hasMore: hasMoreSeq, sentinelRef: seqSentinelRef } = useLazyRows(items)

  const SortIcon = ({ col }: { col: string }) => {
    const active = sortCol === col
    return (
      <span className="inline-flex flex-col ml-1 gap-px align-middle">
        <ChevronUp   size={8} className={active && sortDir === 'asc'  ? 'text-brand' : 'opacity-20'} />
        <ChevronDown size={8} className={active && sortDir === 'desc' ? 'text-brand' : 'opacity-20'} />
      </span>
    )
  }

  const COL_DIM    = 200
  const COL_EXPAND = 24
  const COL_VAL    = 110
  const level0Field = SEQ_FIELDS[0]
  const canExpand0  = maxNivel > 0 && !!level0Field

  if (loading) {
    return (
      <Card noPadding>
        <div className="px-3 py-2 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-brand" />
            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Sequência de Vendas</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      </Card>
    )
  }

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-brand" />
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Sequência de Vendas</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-20">
          <p className="text-[11px] text-text-muted">
            Sem dados no período — ajuste os filtros
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 293 }}>
          <table
            className="border-collapse text-[11px]"
            style={{ minWidth: COL_EXPAND + COL_DIM + periodos.length * COL_VAL + 20 }}
          >
            <thead className="sticky top-0 z-10 bg-surface-light">
              <tr>
                <th style={{ width: COL_EXPAND, minWidth: COL_EXPAND, left: 0 }} className="sticky z-20 bg-surface-light border-b border-surface-border" />
                <th
                  className="sticky z-20 bg-surface-light text-left px-3 py-1.5 text-text-muted font-medium border-b border-r border-surface-border cursor-pointer select-none hover:text-text-primary transition-colors"
                  style={{ minWidth: COL_DIM, width: COL_DIM, left: COL_EXPAND }}
                  onClick={() => handleSort('nome')}
                >
                  Nome Cliente <SortIcon col="nome" />
                </th>
                <th
                  className="text-right px-2 py-1.5 text-text-muted font-medium border-b border-r border-surface-border whitespace-nowrap"
                  style={{ minWidth: 90 }}
                >
                  Limite
                </th>
                {periodos.map(p => (
                  <th
                    key={p}
                    className="text-right px-2 py-1.5 text-text-muted font-medium border-b border-r border-surface-border whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors"
                    style={{ minWidth: COL_VAL }}
                    onClick={() => handleSort(p)}
                  >
                    {periodoLabel(p)} <SortIcon col={p} />
                  </th>
                ))}
                <th
                  className="text-right px-2 py-1.5 text-text-muted font-medium border-b border-surface-border whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors"
                  style={{ minWidth: COL_VAL }}
                  onClick={() => handleSort('total')}
                >
                  Total <SortIcon col="total" />
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleSeqItems.map((item, idx) => {
                const key        = buildRowKey([], 0, item.value)
                const isExpanded = expandedKeys.has(key)
                const isSelected = isBVSeqRowActive(level0Field, item.value, filtros)
                const rowTotal   = periodos.reduce((s, p) => s + (pivot[item.value]?.[p] ?? 0), 0)

                return (
                  <Fragment key={item.value}>
                    <tr className={cn(
                      'border-b border-surface-border/40 hover:bg-surface-light/40 transition-colors',
                      idx % 2 === 1 && !isSelected && 'bg-surface-light/15',
                      isSelected && 'bg-brand/10',
                    )}>
                      <td
                        className="sticky z-[5] bg-surface px-1 text-center cursor-pointer"
                        style={{ left: 0 }}
                        onClick={() => { if (canExpand0) toggleExpand(key) }}
                      >
                        {canExpand0 ? (
                          isExpanded
                            ? <ChevronDown  size={10} className="text-brand/70 mx-auto" />
                            : <ChevronRight size={10} className="text-text-muted hover:text-brand mx-auto transition-colors" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 inline-block" />
                        )}
                      </td>
                      <td
                        className={cn(
                          'sticky z-[5] bg-surface px-3 py-1 border-r border-surface-border cursor-pointer',
                          isSelected && 'border-l-2 border-l-brand',
                        )}
                        style={{ maxWidth: COL_DIM, left: COL_EXPAND }}
                        onClick={() => applyBVSeqFilter(level0Field, item.value, filtros, onFilter)}
                        title={item.label}
                      >
                        <span className={cn(
                          'text-[11px] block truncate',
                          isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                        )}>
                          {item.label}
                        </span>
                        {isExpanded && item.campoAdicional && (
                          <span className="text-[10px] block truncate text-text-muted mt-0.5" title={item.campoAdicional}>
                            {item.campoAdicional}
                          </span>
                        )}
                      </td>
                      <td className="text-right px-2 py-1.5 border-b border-r border-surface-border whitespace-nowrap tabular-nums text-[11px]">
                        {item.limite ? fmtCur(item.limite) : '—'}
                      </td>
                      {periodos.map(p => {
                        const total = pivot[item.value]?.[p]
                        return (
                          <td
                            key={p}
                            className={cn(
                              'px-2 py-1 text-right tabular-nums border-r border-surface-border/30',
                              total ? 'text-text-primary' : 'text-status-danger/30',
                            )}
                          >
                            {total ? fmtCur(total) : '—'}
                          </td>
                        )
                      })}
                      <td className="px-2 py-1 text-right tabular-nums text-text-primary font-medium">
                        {fmtCur(rowTotal)}
                      </td>
                    </tr>

                    {isExpanded && level0Field && (
                      <BVSeqInlineRows
                        parentDrill={buildChildDrill([], 0, level0Field, item.value, item.label)}
                        periodos={periodos}
                        depth={1}
                        expandedKeys={expandedKeys}
                        onToggleExpand={toggleExpand}
                        filtros={filtros}
                        onFilter={onFilter}
                        COL_DIM={COL_DIM}
                      />
                    )}
                  </Fragment>
                )
              })}

              {hasMoreSeq && <tr><td colSpan={999}><div ref={seqSentinelRef} className="h-1" /></td></tr>}
              <tr className="bg-surface-light border-t-2 border-surface-border font-semibold sticky bottom-0">
                <td className="sticky z-[5] bg-surface-light" style={{ left: 0 }} />
                <td className="sticky z-[5] bg-surface-light px-3 py-1.5 text-text-secondary border-r border-surface-border" style={{ left: COL_EXPAND }}>Total</td>
                {periodos.map(p => (
                  <td key={p} className="px-2 py-1.5 text-right tabular-nums text-text-primary border-r border-surface-border/30">
                    {totaisPeriodo[p] ? fmtCur(totaisPeriodo[p]) : '—'}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right tabular-nums text-text-primary">
                  {fmtCur(Object.values(totaisPeriodo).reduce((s, v) => s + v, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
})
