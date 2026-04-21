import { memo, useMemo, useState, useCallback, useRef } from 'react'
import { ChevronUp, ChevronDown, ChevronRight, Package } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, fmtBRL, fmtNum, fmtInt } from '@/lib/utils'
import { useLazyRows } from '@/hooks/useLazyRows'
import type { SimuladorMatrizRow, SimuladorFiltros } from '@/types'

type SortDir = 'asc' | 'desc' | null
interface SortState { col: string | null; dir: SortDir }

function useSortState() {
  const [sort, setSort] = useState<SortState>({ col: null, dir: null })
  const toggle = useCallback((col: string) => {
    setSort(prev => {
      if (prev.col !== col) return { col, dir: 'asc' }
      if (prev.dir === 'asc')  return { col, dir: 'desc' }
      if (prev.dir === 'desc') return { col: null, dir: null }
      return { col, dir: 'asc' }
    })
  }, [])
  return { sort, toggle }
}

function SortIcon({ col, sort }: { col: string; sort: SortState }) {
  if (sort.col !== col) return <span className="inline-block w-2 opacity-0 group-hover:opacity-40">↕</span>
  if (sort.dir === 'asc')  return <ChevronUp   size={9} className="inline-block text-brand ml-0.5" />
  if (sort.dir === 'desc') return <ChevronDown size={9} className="inline-block text-brand ml-0.5" />
  return null
}

const MATRIZ_COLS: { key: keyof SimuladorMatrizRow; label: string; fmt: (v: number) => string }[] = [
  { key: 'vendidas',    label: 'Vendidas',    fmt: fmtInt },
  { key: 'pc',          label: 'PC',          fmt: fmtInt },
  { key: 'pcRestante',  label: 'PC Rest.',    fmt: fmtInt },
  { key: 'compra',      label: 'Compra',      fmt: fmtBRL },
  { key: 'frete',       label: 'Frete',       fmt: fmtBRL },
  { key: 'serrada',     label: 'Serrada',     fmt: fmtBRL },
  { key: 'polimento',   label: 'Polimento',   fmt: fmtBRL },
  { key: 'outCustos',   label: 'Out.Custos',  fmt: fmtBRL },
  { key: 'outDesp',     label: 'Out.Desp.',   fmt: fmtBRL },
  { key: 'servicos',    label: 'Serviços',    fmt: fmtBRL },
  { key: 'custoTotal',  label: 'Custo Total', fmt: fmtBRL },
  { key: 'metrosTotal', label: 'Metros',      fmt: fmtNum },
  { key: 'custoM2',     label: 'Custo M²',    fmt: fmtBRL },
]

interface MaterialGroup {
  codMa:    number
  material: string
  totals:   Omit<SimuladorMatrizRow, 'codMa' | 'material' | 'nBloco'>
  rows:     SimuladorMatrizRow[]
}

function buildMatrizGroups(rows: SimuladorMatrizRow[]): MaterialGroup[] {
  const map = new Map<number, MaterialGroup>()
  for (const row of rows) {
    if (!map.has(row.codMa)) {
      map.set(row.codMa, {
        codMa: row.codMa,
        material: row.material,
        totals: {
          vendidas: 0, pc: 0, pcRestante: 0,
          compra: 0, frete: 0, serrada: 0, polimento: 0,
          outCustos: 0, outDesp: 0, servicos: 0,
          custoTotal: 0, metrosTotal: 0, custoM2: 0,
        },
        rows: [],
      })
    }
    const g = map.get(row.codMa)!
    g.rows.push(row)
    const t = g.totals
    t.vendidas    += row.vendidas
    t.pc          += row.pc
    t.pcRestante  += row.pcRestante
    t.compra      += row.compra
    t.frete       += row.frete
    t.serrada     += row.serrada
    t.polimento   += row.polimento
    t.outCustos   += row.outCustos
    t.outDesp     += row.outDesp
    t.servicos    += row.servicos
    t.custoTotal  += row.custoTotal
    t.metrosTotal += row.metrosTotal
  }
  for (const g of map.values()) {
    g.totals.custoM2 = g.totals.metrosTotal !== 0
      ? g.totals.custoTotal / g.totals.metrosTotal : 0
  }
  return Array.from(map.values())
}

const MTRZ_COL_MAT  = 180
const MTRZ_COL_BLOCO = 72
const MTRZ_TD_BASE  = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right text-text-primary whitespace-nowrap'
const MTRZ_TD_LEFT  = 'px-2.5 py-1.5 text-[11px] text-left text-text-primary whitespace-nowrap'

const MatrizGroupRow = memo(function MatrizGroupRow({ group: g, isActive, isExpanded: isExp, onToggleExpand, onToggleFilter }: {
  group: MaterialGroup; isActive: boolean; isExpanded: boolean
  onToggleExpand: (codMa: number) => void
  onToggleFilter: (codMa: number) => void
}) {
  return (
    <tr
      className={cn(
        'border-b border-[var(--line)] cursor-pointer select-none transition-colors',
        isActive ? 'bg-brand/10 hover:bg-brand/15' : 'bg-surface-light/20 hover:bg-surface-light/60',
      )}
      onClick={() => onToggleFilter(g.codMa)}
    >
      <td
        className={cn(MTRZ_TD_LEFT, 'sticky left-0 z-[5] font-semibold',
          isActive ? 'bg-brand/10 text-brand' : 'bg-surface-light/60 text-text-primary',
        )}
        style={{ minWidth: MTRZ_COL_MAT }}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onToggleExpand(g.codMa) }}
            className="shrink-0 text-text-muted hover:text-brand transition-colors"
          >
            {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <span className="truncate">{g.material}</span>
          <span className="text-[9px] text-text-muted/60 shrink-0">({g.rows.length})</span>
        </div>
      </td>
      <td
        className={cn(MTRZ_TD_BASE, 'sticky z-[5] text-text-muted',
          isActive ? 'bg-brand/10' : 'bg-surface-light/60',
        )}
        style={{ minWidth: MTRZ_COL_BLOCO, left: MTRZ_COL_MAT }}
      >
        —
      </td>
      {MATRIZ_COLS.map(c => (
        <td
          key={c.key}
          className={cn(MTRZ_TD_BASE, 'font-medium',
            c.key === 'pcRestante' && (g.totals as unknown as Record<string, number>)[c.key] < 0
              ? 'text-status-danger'
              : isActive ? 'text-text-primary' : '',
          )}
        >
          {c.fmt((g.totals as unknown as Record<string, number>)[c.key] ?? 0)}
        </td>
      ))}
    </tr>
  )
})

const MatrizBlocoRow = memo(function MatrizBlocoRow({ row, isActive, onToggleFilter }: {
  row: SimuladorMatrizRow; isActive: boolean
  onToggleFilter: (nBloco: number, e: React.MouseEvent) => void
}) {
  return (
    <tr
      className={cn(
        'border-b border-[var(--line)] cursor-pointer select-none transition-colors',
        isActive ? 'bg-chart-blue/10 hover:bg-chart-blue/15' : 'hover:bg-surface-light/30',
      )}
      onClick={e => onToggleFilter(row.nBloco, e)}
    >
      <td
        className={cn(MTRZ_TD_LEFT, 'sticky left-0 z-[5] pl-3 text-text-muted text-[11px]',
          isActive ? 'bg-chart-blue/10' : 'bg-surface',
        )}
        style={{ minWidth: MTRZ_COL_MAT }}
      >
        <div className="flex items-center gap-1">
          <span className="text-text-muted/40 shrink-0">└</span>
          <span className="flex-1 truncate">{row.material}</span>
        </div>
      </td>
      <td
        className={cn(MTRZ_TD_BASE, 'sticky z-[5] font-medium',
          isActive ? 'bg-chart-blue/10 text-chart-blue' : 'bg-surface text-text-muted',
        )}
        style={{ minWidth: MTRZ_COL_BLOCO, left: MTRZ_COL_MAT }}
      >
        {row.nBloco}
      </td>
      {MATRIZ_COLS.map(c => (
        <td
          key={c.key}
          className={cn(MTRZ_TD_BASE,
            c.key === 'pcRestante' && row.pcRestante < 0 ? 'text-status-danger' : '',
          )}
        >
          {c.fmt(row[c.key] as number)}
        </td>
      ))}
    </tr>
  )
})

export interface MatrizMateriaisProps {
  rows:             SimuladorMatrizRow[]
  loading:          boolean
  filtrosMateriais: number[]
  filtrosBlocos:    number[]
  setFiltros:       (p: Partial<SimuladorFiltros>) => void
  maxHeight?:       number
}

export const MatrizMateriais = memo(function MatrizMateriais({
  rows, loading, filtrosMateriais, filtrosBlocos, setFiltros, maxHeight,
}: MatrizMateriaisProps) {
  const { sort, toggle } = useSortState()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const filtrosMatRef = useRef(filtrosMateriais)
  filtrosMatRef.current = filtrosMateriais
  const filtrosBloRef = useRef(filtrosBlocos)
  filtrosBloRef.current = filtrosBlocos

  const toggleExpand = useCallback((codMa: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(codMa) ? next.delete(codMa) : next.add(codMa)
      return next
    })
  }, [])

  const toggleMatFilter = useCallback((codMa: number) => {
    const cur = filtrosMatRef.current
    setFiltros({
      materiais: cur.includes(codMa)
        ? cur.filter(v => v !== codMa)
        : cur.concat(codMa),
    })
  }, [setFiltros])

  const toggleBlocoFilter = useCallback((nBloco: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const cur = filtrosBloRef.current
    setFiltros({
      blocos: cur.includes(nBloco)
        ? cur.filter(v => v !== nBloco)
        : cur.concat(nBloco),
    })
  }, [setFiltros])

  const filtrosMatSet = useMemo(() => new Set(filtrosMateriais), [filtrosMateriais])
  const filtrosBloSet = useMemo(() => new Set(filtrosBlocos), [filtrosBlocos])

  const MAX_ROWS = 500
  const limitedRows = useMemo(() => rows.slice(0, MAX_ROWS), [rows])
  const groups = useMemo(() => buildMatrizGroups(limitedRows), [limitedRows])

  const sortedGroups = useMemo(() => {
    if (!sort.col || !sort.dir) return groups
    return [...groups].sort((a, b) => {
      if (sort.col === 'material') {
        return sort.dir === 'asc'
          ? a.material.localeCompare(b.material, 'pt-BR')
          : b.material.localeCompare(a.material, 'pt-BR')
      }
      const key = sort.col as keyof typeof a.totals
      const av = (a.totals as Record<string, number>)[key] ?? 0
      const bv = (b.totals as Record<string, number>)[key] ?? 0
      return sort.dir === 'asc' ? av - bv : bv - av
    })
  }, [groups, sort])

  const { visible: visibleGroups, hasMore: hasMoreGroups, sentinelRef: groupSentinelRef } = useLazyRows(sortedGroups)

  const totais = useMemo(() => {
    const sum = (key: keyof SimuladorMatrizRow) => limitedRows.reduce((s, r) => s + (r[key] as number), 0)
    const ct = sum('custoTotal'), mt = sum('metrosTotal')
    return {
      vendidas: sum('vendidas'), pc: sum('pc'), pcRestante: sum('pcRestante'),
      compra: sum('compra'), frete: sum('frete'), serrada: sum('serrada'),
      polimento: sum('polimento'), outCustos: sum('outCustos'), outDesp: sum('outDesp'),
      servicos: sum('servicos'), custoTotal: ct, metrosTotal: mt,
      custoM2: mt !== 0 ? ct / mt : 0,
    }
  }, [rows])

  if (loading) {
    return (
      <div className="space-y-1.5 p-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <Package size={28} className="text-text-muted/40" />
        <p className="text-sm text-text-muted">Nenhum dado encontrado</p>
        <p className="text-xs text-text-muted/60">Ajuste os filtros ou verifique os dados</p>
      </div>
    )
  }

  const thBase = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap text-right cursor-pointer select-none group hover:text-text-primary transition-colors'
  const thLeft = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap text-left cursor-pointer select-none group hover:text-text-primary transition-colors'

  return (
    <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: maxHeight ?? 280 }}>
      <table className="min-w-max w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface-light">
          <tr className="border-b border-surface-border">
            <th
              className={cn(thLeft, 'sticky left-0 z-20 bg-surface-light')}
              style={{ minWidth: MTRZ_COL_MAT }}
              onClick={() => toggle('material')}
            >
              Material <SortIcon col="material" sort={sort} />
            </th>
            <th
              className={cn(thBase, 'sticky z-20 bg-surface-light')}
              style={{ minWidth: MTRZ_COL_BLOCO, left: MTRZ_COL_MAT }}
            >
              Nº Bloco
            </th>
            {MATRIZ_COLS.map(c => (
              <th key={c.key} className={thBase} onClick={() => toggle(c.key)}>
                {c.label} <SortIcon col={c.key} sort={sort} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleGroups.map((g) => {
            const isExp       = expanded.has(g.codMa)
            const isMatActive = filtrosMatSet.has(g.codMa)
            return [
              <MatrizGroupRow
                key={`mat-${g.codMa}`}
                group={g}
                isActive={isMatActive}
                isExpanded={isExp}
                onToggleExpand={toggleExpand}
                onToggleFilter={toggleMatFilter}
              />,
              ...(isExp ? g.rows.map((row) => (
                <MatrizBlocoRow
                  key={`bloco-${g.codMa}-${row.nBloco}`}
                  row={row}
                  isActive={filtrosBloSet.has(row.nBloco)}
                  onToggleFilter={toggleBlocoFilter}
                />
              )) : []),
            ]
          })}
          {hasMoreGroups && (
            <tr>
              <td colSpan={999}>
                <div ref={groupSentinelRef} className="h-8 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-brand/40 border-t-brand animate-spin" />
                </div>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="sticky bottom-0 z-[5] bg-surface-light border-t-2 border-[var(--line)]">
          <tr>
            <td className={cn(MTRZ_TD_LEFT, 'sticky left-0 z-20 bg-surface-light font-semibold text-brand')} style={{ minWidth: MTRZ_COL_MAT }}>
              TOTAL
            </td>
            <td className={cn(MTRZ_TD_BASE, 'sticky z-20 bg-surface-light')} style={{ minWidth: MTRZ_COL_BLOCO, left: MTRZ_COL_MAT }}>—</td>
            {MATRIZ_COLS.map(c => (
              <td key={c.key} className={cn(MTRZ_TD_BASE, 'font-semibold text-brand')}>
                {c.fmt((totais as Record<string, number>)[c.key] ?? 0)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
})
