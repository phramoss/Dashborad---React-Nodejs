import { memo, useMemo, useState, useCallback, useEffect, Fragment } from 'react'
import { BarChart2, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, fmtNum, MESES_ABREV, formatCurrency } from '@/lib/utils'
import { useLazyRows } from '@/hooks/useLazyRows'
import { useBVEstoqueFaturamentoChildren } from '@/hooks/useBuracoVendasData'
import type { BuracoVendasFiltros, EstoqueMatrizResult, EstoqueDrillState, MatrizSort } from '@/types'
import {
  buildRowKey, buildChildDrill, FAT_FIELDS, isBVFatRowActive, applyBVFatFilter,
} from './bv-helpers'

const fmtCur = (v: number) => formatCurrency(v)

interface BVFatInlineMatrizRowsProps {
  parentDrill:    EstoqueDrillState
  periodos:       string[]
  depth:          number
  maxNivel:       number
  expandedKeys:   Set<string>
  onToggleExpand: (key: string) => void
  filtros:        BuracoVendasFiltros
  onFilter:       (p: Partial<BuracoVendasFiltros>) => void
  COL_DIM:        number
}

function BVFatInlineMatrizRows({
  parentDrill, periodos, depth, maxNivel,
  expandedKeys, onToggleExpand, filtros, onFilter, COL_DIM,
}: BVFatInlineMatrizRowsProps) {
  const { data, isLoading } = useBVEstoqueFaturamentoChildren(parentDrill)
  const currentLevel = parentDrill.nivel
  const rows         = data?.rows ?? []
  const currentField = FAT_FIELDS[currentLevel]
  const canExpand    = currentLevel < maxNivel && !!currentField

  const { itemMap, pivot } = useMemo(() => {
    const im = new Map<string, string>()
    rows.forEach(r => { if (!im.has(String(r.value))) im.set(String(r.value), r.label) })
    const pv: Record<string, Record<string, { quantidade: number; total: number }>> = {}
    rows.forEach(r => {
      const pk = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      const ik = String(r.value)
      if (!pv[ik]) pv[ik] = {}
      pv[ik][pk] = { quantidade: r.quantidade, total: r.total }
    })
    return { itemMap: im, pivot: pv }
  }, [rows])

  if (isLoading) {
    return (
      <tr>
        <td colSpan={2 + periodos.length * 2}>
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
        const isExpanded = expandedKeys.has(key)
        const isSelected = isBVFatRowActive(currentField, value, parentDrill.path, filtros)

        return (
          <Fragment key={key}>
            <tr className={cn(
              'border-b border-surface-border/30 hover:bg-surface-light/40 transition-colors',
              isSelected && 'bg-brand/10',
            )}>
              <td
                colSpan={2}
                className={cn('sticky z-[5] bg-surface border-r border-surface-border', isSelected && 'border-l-2 border-l-brand')}
                style={{ maxWidth: COL_DIM + 24, paddingLeft: 4 + depth * 14, left: 0 }}
              >
                <div className="flex items-center gap-1 min-w-0 py-1">
                  <button
                    type="button"
                    className="shrink-0 w-4 h-4 flex items-center justify-center"
                    onClick={() => { if (canExpand) onToggleExpand(key) }}
                    tabIndex={canExpand ? 0 : -1}
                  >
                    {canExpand ? (
                      isExpanded
                        ? <ChevronDown  size={10} className="text-brand/70" />
                        : <ChevronRight size={10} className="text-text-muted hover:text-brand transition-colors" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 block" />
                    )}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex-1 text-[11px] text-left truncate pr-2',
                      isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                    )}
                    onClick={() => applyBVFatFilter(currentField, value, parentDrill.path, filtros, onFilter)}
                    title={label}
                  >
                    {label}
                  </button>
                </div>
              </td>
              {periodos.map(p => {
                const cell = pivot[value]?.[p]
                return (
                  <Fragment key={p}>
                    <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary">
                      {cell ? fmtNum(cell.quantidade) : ''}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary border-r border-surface-border/30">
                      {cell ? fmtNum(cell.total) : ''}
                    </td>
                  </Fragment>
                )
              })}
            </tr>

            {isExpanded && canExpand && currentField && (
              <BVFatInlineMatrizRows
                parentDrill={buildChildDrill(parentDrill.path, currentLevel, currentField, value, label)}
                periodos={periodos}
                depth={depth + 1}
                maxNivel={maxNivel}
                expandedKeys={expandedKeys}
                onToggleExpand={onToggleExpand}
                filtros={filtros}
                onFilter={onFilter}
                COL_DIM={COL_DIM}
              />
            )}
          </Fragment>
        )
      })}
    </>
  )
}

export interface BVFatHierarchyMatrizProps {
  data?:         EstoqueMatrizResult
  loading?:      boolean
  filtros:       BuracoVendasFiltros
  onFilter:      (p: Partial<BuracoVendasFiltros>) => void
  onSortChange?: (sort: MatrizSort) => void
}

export const BVFatHierarchyMatriz = memo(function BVFatHierarchyMatriz({
  data, loading, filtros, onFilter, onSortChange,
}: BVFatHierarchyMatrizProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  useEffect(() => {
    onSortChange?.({ col: sortCol, dir: sortDir })
  }, [sortCol, sortDir, onSortChange])

  const handleSort = useCallback((col: string) => {
    setSortCol(prev => {
      if (prev !== col) { setSortDir('asc'); return col }
      setSortDir(d => { if (d === 'asc') return 'desc'; setSortCol(null); return null })
      return prev
    })
  }, [])

  const SortIcon = ({ col }: { col: string }) => {
    const active = sortCol === col
    return (
      <span className="inline-flex flex-col ml-1 gap-px align-middle">
        <ChevronUp   size={8} className={active && sortDir === 'asc'  ? 'text-brand' : 'opacity-20'} />
        <ChevronDown size={8} className={active && sortDir === 'desc' ? 'text-brand' : 'opacity-20'} />
      </span>
    )
  }

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const rows     = data?.rows     ?? []
  const maxNivel = data?.maxNivel ?? 3

  const { periodos, items, pivot, totaisPeriodo } = useMemo(() => {
    if (!rows.length) return {
      periodos: [] as string[],
      items: [] as { value: string; label: string }[],
      pivot: {} as Record<string, Record<string, { quantidade: number; total: number }>>,
      totaisPeriodo: {} as Record<string, { quantidade: number; total: number }>,
    }

    const periodSet = new Set<string>()
    rows.forEach(r => periodSet.add(`${r.ano}-${String(r.mes).padStart(2, '0')}`))
    const periodos = Array.from(periodSet).sort()

    const itemMap = new Map<string, string>()
    rows.forEach(r => { if (!itemMap.has(String(r.value))) itemMap.set(String(r.value), r.label) })
    const items = Array.from(itemMap.entries()).map(([value, label]) => ({ value, label }))

    const pivot: Record<string, Record<string, { quantidade: number; total: number }>> = {}
    const totaisPeriodo: Record<string, { quantidade: number; total: number }> = {}
    rows.forEach(r => {
      const pk = `${r.ano}-${String(r.mes).padStart(2, '0')}`
      const ik = String(r.value)
      if (!pivot[ik]) pivot[ik] = {}
      pivot[ik][pk] = { quantidade: r.quantidade, total: r.total }
      if (!totaisPeriodo[pk]) totaisPeriodo[pk] = { quantidade: 0, total: 0 }
      totaisPeriodo[pk].quantidade += r.quantidade
      totaisPeriodo[pk].total      += r.total
    })

    return { periodos, items, pivot, totaisPeriodo }
  }, [rows])

  const periodoLabel = (key: string) => {
    const [ano, mes] = key.split('-')
    return `${MESES_ABREV[Number(mes) - 1] ?? mes} de ${ano}`
  }

  const { visible: visibleFatItems, hasMore: hasMoreFat, sentinelRef: fatSentinelRef } = useLazyRows(items)

  const COL_DIM    = 156
  const COL_EXPAND = 24
  const COL_VAL    = 96
  const level0Field = FAT_FIELDS[0]
  const canExpand0  = maxNivel > 0 && !!level0Field

  if (loading) {
    return (
      <Card noPadding>
        <div className="px-3 py-2 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <BarChart2 size={12} className="text-brand" />
            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Estoque por Faturamento</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      </Card>
    )
  }

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <BarChart2 size={12} className="text-brand" />
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Estoque por Faturamento</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-20">
          <p className="text-[11px] text-text-muted">Sem dados de faturamento no período</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 293 }}>
          <table
            className="border-collapse text-[11px]"
            style={{ minWidth: COL_EXPAND + COL_DIM + periodos.length * COL_VAL * 2 + COL_VAL + 20 }}
          >
            <thead className="sticky top-0 z-10 bg-surface-light">
              <tr>
                <th rowSpan={2} style={{ width: COL_EXPAND, minWidth: COL_EXPAND, left: 0 }} className="sticky z-20 bg-surface-light border-b border-surface-border" />
                <th
                  rowSpan={2}
                  className="sticky z-20 bg-surface-light text-left px-3 py-1.5 text-text-muted font-medium border-b border-r border-surface-border cursor-pointer select-none hover:text-text-primary transition-colors"
                  style={{ minWidth: COL_DIM, width: COL_DIM, left: COL_EXPAND }}
                  onClick={() => handleSort('nome')}
                >
                  Material <SortIcon col="nome" />
                </th>
                {periodos.map(p => (
                  <th
                    key={p}
                    colSpan={2}
                    className="text-center px-2 py-1.5 text-text-muted font-medium border-b border-r border-surface-border capitalize whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors"
                    style={{ minWidth: COL_VAL * 2 }}
                    onClick={() => handleSort(p)}
                  >
                    {periodoLabel(p)} <SortIcon col={p} />
                  </th>
                ))}
                <th rowSpan={2} className="text-right px-2 py-1.5 text-text-muted font-medium border-b border-l border-surface-border whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors" style={{ minWidth: COL_VAL }} onClick={() => handleSort('total')}>
                  Total <SortIcon col="total" />
                </th>
              </tr>
              <tr>
                {periodos.map(p => (
                  <Fragment key={p}>
                    <th className="text-right px-2 py-1 text-text-muted font-medium border-b border-surface-border whitespace-nowrap" style={{ minWidth: COL_VAL }}>
                      Qtde
                    </th>
                    <th className="text-right px-2 py-1 text-text-muted font-medium border-b border-r border-surface-border whitespace-nowrap" style={{ minWidth: COL_VAL }}>
                      Total
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {visibleFatItems.map((item, idx) => {
                const key        = buildRowKey([], 0, item.value)
                const isExpanded = expandedKeys.has(key)
                const isSelected = isBVFatRowActive(level0Field, item.value, [], filtros)
                const rowTotal   = periodos.reduce((s, p) => s + (pivot[item.value]?.[p]?.total ?? 0), 0)

                return (
                  <Fragment key={item.value}>
                    <tr className={cn(
                      'border-b border-surface-border/40 hover:bg-surface-light/40 transition-colors',
                      idx % 2 === 1 && !isSelected && 'bg-surface-light/15',
                      isSelected && 'bg-brand/10',
                    )}>
                      <td className="sticky z-[5] bg-surface px-1 text-center cursor-pointer" style={{ left: 0 }} onClick={() => { if (canExpand0) toggleExpand(key) }}>
                        {canExpand0 ? (
                          isExpanded
                            ? <ChevronDown  size={10} className="text-brand/70 mx-auto" />
                            : <ChevronRight size={10} className="text-text-muted hover:text-brand mx-auto transition-colors" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 inline-block" />
                        )}
                      </td>
                      <td
                        className={cn('sticky z-[5] bg-surface px-3 py-1 border-r border-surface-border cursor-pointer', isSelected && 'border-l-2 border-l-brand')}
                        style={{ maxWidth: COL_DIM, left: COL_EXPAND }}
                        onClick={() => applyBVFatFilter(level0Field, item.value, [], filtros, onFilter)}
                        title={item.label}
                      >
                        <span className={cn('text-[11px] block truncate', isSelected ? 'text-brand font-medium' : 'text-text-secondary')}>
                          {item.label}
                        </span>
                      </td>
                      {periodos.map(p => {
                        const cell = pivot[item.value]?.[p]
                        return (
                          <Fragment key={p}>
                            <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary">
                              {cell ? fmtNum(cell.quantidade) : ''}
                            </td>
                            <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary border-r border-surface-border/30">
                              {cell ? fmtNum(cell.total) : ''}
                            </td>
                          </Fragment>
                        )
                      })}
                      <td className="px-2 py-1 text-right tabular-nums text-[11px] text-text-primary font-medium border-l border-surface-border/30">
                        {rowTotal ? fmtCur(rowTotal) : '—'}
                      </td>
                    </tr>

                    {isExpanded && level0Field && (
                      <BVFatInlineMatrizRows
                        parentDrill={buildChildDrill([], 0, level0Field, item.value, item.label)}
                        periodos={periodos}
                        depth={1}
                        maxNivel={maxNivel}
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

              {hasMoreFat && <tr><td colSpan={999}><div ref={fatSentinelRef} className="h-1" /></td></tr>}
              <tr className="bg-surface-light border-t-2 border-surface-border font-semibold sticky bottom-0">
                <td className="sticky z-[5] bg-surface-light" style={{ left: 0 }} />
                <td className="sticky z-[5] bg-surface-light px-3 py-1.5 text-text-secondary border-r border-surface-border" style={{ left: COL_EXPAND }}>Total</td>
                {periodos.map(p => {
                  const t = totaisPeriodo[p]
                  return (
                    <Fragment key={p}>
                      <td className="px-2 py-1.5 text-right tabular-nums text-text-primary">
                        {t ? fmtNum(t.quantidade) : ''}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-text-primary border-r border-surface-border/30">
                        {t ? fmtNum(t.total) : ''}
                      </td>
                    </Fragment>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
})
