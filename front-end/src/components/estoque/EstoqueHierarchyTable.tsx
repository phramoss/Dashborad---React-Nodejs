import { memo, useMemo, useState, useCallback, Fragment } from 'react'
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, fmtNum, fmtInt } from '@/lib/utils'
import { useLazyRows } from '@/hooks/useLazyRows'
import { useEstoqueTableChildren } from '@/hooks/useEstoqueData'
import type { EstoqueTableResult, EstoqueDrillState, EstoqueFiltros } from '@/types'
import {
  buildRowKey, buildChildDrill, isRowActive, applyClickFilter,
} from './estoque-helpers'

// ─── InlineRows — filhos recursivos de HierarchyTable ─────────
interface InlineRowsProps {
  endpoint:       'chapa' | 'bloco'
  parentDrill:    EstoqueDrillState
  depth:          number
  fields:         string[]
  maxNivel:       number
  expandedKeys:   Set<string>
  onToggleExpand: (key: string) => void
  filtros:        EstoqueFiltros
  onFilter:       (p: Partial<EstoqueFiltros>) => void
}

function InlineRows({
  endpoint, parentDrill, depth, fields, maxNivel,
  expandedKeys, onToggleExpand, filtros, onFilter,
}: InlineRowsProps) {
  const { data, isLoading } = useEstoqueTableChildren(endpoint, parentDrill)
  const currentLevel = parentDrill.nivel
  const rows         = data?.rows ?? []
  const currentField = fields[currentLevel]
  const canExpand    = currentLevel < maxNivel && !!fields[currentLevel]

  if (isLoading) {
    return (
      <div className="px-3 py-1.5" style={{ paddingLeft: 12 + depth * 16 }}>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!rows.length) return null

  return (
    <>
      {rows.map(row => {
        const key        = buildRowKey(parentDrill.path, currentLevel, row.value)
        const isExpanded = expandedKeys.has(key)
        const isSelected = isRowActive(currentLevel, row.value, currentField, parentDrill.path, filtros)

        return (
          <Fragment key={key}>
            <div
              className={cn(
                'grid grid-cols-[1fr_88px_52px] border-b border-surface-border/20',
                'hover:bg-surface-light/40 transition-colors',
                isSelected && 'bg-brand/10 border-l-2 border-l-brand',
              )}
            >
              <div className="flex items-center gap-1 min-w-0 py-1" style={{ paddingLeft: 8 + depth * 16 }}>
                <button
                  type="button"
                  className="shrink-0 w-4 h-4 flex items-center justify-center"
                  onClick={() => { if (canExpand) onToggleExpand(key) }}
                  tabIndex={canExpand ? 0 : -1}
                  aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                >
                  {canExpand ? (
                    isExpanded
                      ? <ChevronDown size={10} className="text-brand/70" />
                      : <ChevronRight size={10} className="text-text-muted hover:text-brand transition-colors" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 block" />
                  )}
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex-1 text-[11px] text-left truncate pr-1',
                    isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                  )}
                  onClick={() => applyClickFilter(currentLevel, row.value, currentField, parentDrill.path, filtros, onFilter)}
                  title={row.label}
                >
                  {row.label}
                </button>
              </div>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                {fmtNum(row.metragem)}
              </span>
              <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-1">
                {fmtInt(row.pc)}
              </span>
            </div>

            {isExpanded && canExpand && (
              <InlineRows
                endpoint={endpoint}
                parentDrill={buildChildDrill(parentDrill.path, currentLevel, currentField, row.value, row.label)}
                depth={depth + 1}
                fields={fields}
                maxNivel={maxNivel}
                expandedKeys={expandedKeys}
                onToggleExpand={onToggleExpand}
                filtros={filtros}
                onFilter={onFilter}
              />
            )}
          </Fragment>
        )
      })}
    </>
  )
}

// ─── HierarchyTable ───────────────────────────────────────────
export interface HierarchyTableProps {
  title:    string
  headers:  string[]
  fields:   string[]
  endpoint: 'chapa' | 'bloco'
  data?:    EstoqueTableResult
  loading?: boolean
  filtros:  EstoqueFiltros
  onFilter: (p: Partial<EstoqueFiltros>) => void
  icon?:    React.ElementType
}

export const HierarchyTable = memo(function HierarchyTable({
  title, headers, fields, endpoint, data, loading, filtros, onFilter, icon: Icon,
}: HierarchyTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

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
    if (sortDir === 'desc') return <ChevronDown size={9} className="inline-block text-brand" />
    return <span className="inline-block w-2.5" />
  }

  const rawRows    = data?.rows     ?? []
  const totais     = data?.totais
  const maxNivel   = data?.maxNivel ?? fields.length
  const level0Field = fields[0]
  const canExpand0 = maxNivel > 0 && !!level0Field

  const rows = useMemo(() => {
    if (!sortCol || !sortDir) return rawRows
    return [...rawRows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortCol === 'label')    return dir * a.label.localeCompare(b.label)
      if (sortCol === 'metragem') return dir * (a.metragem - b.metragem)
      if (sortCol === 'pc')       return dir * (a.pc - b.pc)
      return 0
    })
  }, [rawRows, sortCol, sortDir])

  const { visible: visibleRows, hasMore: hasMoreRows, sentinelRef: rowSentinelRef } = useLazyRows(rows)

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={12} className="text-brand shrink-0" />}
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">{title}</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_88px_52px] px-3 py-1.5 bg-surface-light border-b border-surface-border shrink-0">
        <button type="button" onClick={() => handleSort('label')}
          className="flex items-center gap-0.5 text-[10px] text-text-muted uppercase tracking-wider pl-5 hover:text-text-secondary">
          {headers[0]} <SortIcon col="label" />
        </button>
        <button type="button" onClick={() => handleSort('metragem')}
          className="flex items-center justify-end gap-0.5 text-[10px] text-text-muted uppercase tracking-wider pr-2 hover:text-text-secondary">
          <SortIcon col="metragem" /> Metragem
        </button>
        <button type="button" onClick={() => handleSort('pc')}
          className="flex items-center justify-end gap-0.5 text-[10px] text-text-muted uppercase tracking-wider pr-1 hover:text-text-secondary">
          <SortIcon col="pc" /> PC
        </button>
      </div>

      <div className="overflow-y-auto flex-1" style={{ maxHeight: 340 }}>
        {loading ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[11px] text-text-muted">Sem dados</p>
          </div>
        ) : (
          <>
            {visibleRows.map((row, idx) => {
              const key        = buildRowKey([], 0, row.value)
              const isExpanded = expandedKeys.has(key)
              const isSelected = isRowActive(0, row.value, level0Field, [], filtros)

              return (
                <Fragment key={key}>
                  <div
                    className={cn(
                      'grid grid-cols-[1fr_88px_52px] border-b border-surface-border/30',
                      'hover:bg-surface-light/40 transition-colors',
                      idx % 2 === 1 && !isSelected && 'bg-surface-light/15',
                      isSelected && 'bg-brand/10 border-l-2 border-l-brand',
                    )}
                  >
                    <div className="flex items-center gap-1 min-w-0 py-1 pl-2">
                      <button
                        type="button"
                        className="shrink-0 w-4 h-4 flex items-center justify-center"
                        onClick={() => { if (canExpand0) toggleExpand(key) }}
                        tabIndex={canExpand0 ? 0 : -1}
                        aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                      >
                        {canExpand0 ? (
                          isExpanded
                            ? <ChevronDown size={10} className="text-brand/70" />
                            : <ChevronRight size={10} className="text-text-muted hover:text-brand transition-colors" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 block" />
                        )}
                      </button>
                      <button
                        type="button"
                        className={cn(
                          'flex-1 text-[11px] text-left truncate pr-1',
                          isSelected ? 'text-brand font-medium' : 'text-text-secondary',
                        )}
                        onClick={() => applyClickFilter(0, row.value, level0Field, [], filtros, onFilter)}
                        title={row.label}
                      >
                        {row.label}
                      </button>
                    </div>
                    <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-2">
                      {fmtNum(row.metragem)}
                    </span>
                    <span className="text-[11px] text-text-primary tabular-nums text-right self-center pr-1">
                      {fmtInt(row.pc)}
                    </span>
                  </div>

                  {isExpanded && canExpand0 && level0Field && (
                    <InlineRows
                      endpoint={endpoint}
                      parentDrill={buildChildDrill([], 0, level0Field, row.value, row.label)}
                      depth={1}
                      fields={fields}
                      maxNivel={maxNivel}
                      expandedKeys={expandedKeys}
                      onToggleExpand={toggleExpand}
                      filtros={filtros}
                      onFilter={onFilter}
                    />
                  )}
                </Fragment>
              )
            })}
            {hasMoreRows && <div ref={rowSentinelRef} className="h-1" />}
          </>
        )}
      </div>

      {!loading && totais && (
        <div className="grid grid-cols-[1fr_88px_52px] px-3 py-1.5 bg-surface-light border-t border-surface-border shrink-0">
          <span className="text-[11px] font-semibold text-text-secondary pl-5">Total</span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-2">
            {fmtNum(totais.metragem)}
          </span>
          <span className="text-[11px] font-semibold text-text-primary tabular-nums text-right pr-1">
            {fmtInt(totais.pc)}
          </span>
        </div>
      )}
    </Card>
  )
})
