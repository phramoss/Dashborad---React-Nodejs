import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  SlidersHorizontal, RefreshCw, BarChart2, TrendingUp,
  ChevronUp, ChevronDown, ChevronRight, Package, DollarSign, Percent,
  Calculator, Target, AlertCircle, Layers,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import { useSimuladorStore } from '@/store/simulador.store'
import {
  useSimuladorFiltrosDisponiveis,
  useSimuladorMatriz,
  useSimuladorVendas,
  useSimuladorResumo,
} from '@/hooks/useSimuladorData'
import type {
  SimuladorFiltros,
  SimuladorMatrizRow,
  SimuladorVendaRow,
  SimuladorResumo,
} from '@/types'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

const fmtNum = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtInt = (v: number) =>
  Math.round(v).toLocaleString('pt-BR')

const fmtPct = (v: number) =>
  `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

const safe = (n: number | null | undefined) =>
  (n === null || n === undefined || !isFinite(n) || isNaN(n)) ? 0 : n

const safeDivide = (num: number, den: number) =>
  den !== 0 ? num / den : 0

interface SimuladorCalcs {
  pcRestante:      number
  pdrPrecoM2:      number
  pdrFaturado:     number
  pdrLucro:        number
  qtdeEstq:        number | 'S/ ESTOQUE'
  precoSemLucro:   number
  precoAplicar:    number
  lucroVariavel:   number
  precoVendaVar:   number | 'S/ESTOQUE'
}

function calcSimulador(r: SimuladorResumo, varLucro: number): SimuladorCalcs {
  const {
    sumCustoTotal, sumMetrosTotal, sumPcBloco,
    maxDfixa, maxDvariavel, maxLucro,
    sumVendasTotal, sumVendasPc, sumVendasQtde,
  } = r

  const pcRestante = sumPcBloco - sumVendasPc

  const denPdr = 1 - (maxDvariavel + maxDfixa + maxLucro)
  const pdrPrecoM2  = denPdr !== 0 && sumMetrosTotal !== 0
    ? safeDivide(sumCustoTotal / denPdr, sumMetrosTotal)
    : 0
  const pdrFaturado = pdrPrecoM2 * sumMetrosTotal
  const pdrLucro    = denPdr !== 0 ? (sumCustoTotal / denPdr) * maxLucro : 0

  const qtdeEstq: number | 'S/ ESTOQUE' =
    sumVendasPc > sumPcBloco
      ? sumVendasQtde - sumMetrosTotal
      : sumPcBloco > sumVendasPc
        ? sumMetrosTotal - sumVendasQtde
        : 'S/ ESTOQUE'

  const denSemLucro = 1 - (maxDfixa + maxDvariavel)
  const precoSemLucro = denSemLucro !== 0 && sumMetrosTotal !== 0
    ? safeDivide(sumCustoTotal / denSemLucro, sumMetrosTotal)
    : 0

  const precoAplicar = (() => {
    if (sumVendasPc === sumPcBloco) return 0
    const totalFatSistema = denPdr !== 0 ? sumCustoTotal / denPdr : 0
    if (sumVendasTotal > totalFatSistema) return pdrPrecoM2
    const denApl = sumMetrosTotal - sumVendasQtde
    const denAplLucro = 1 - (maxDfixa + maxDvariavel + maxLucro)
    return denApl !== 0 && denAplLucro !== 0
      ? safeDivide((sumCustoTotal / denAplLucro) - sumVendasTotal, denApl)
      : 0
  })()

  const denVar = 1 - (maxDfixa + maxDvariavel + varLucro)
  const denVarFat = denVar !== 0 ? sumCustoTotal / denVar : 0
  const totalFatSistema = denPdr !== 0 ? sumCustoTotal / denPdr : 0

  const precoAplicarVar = (() => {
    if (sumVendasPc === sumPcBloco) return 0
    if (sumVendasTotal > totalFatSistema) return pdrPrecoM2
    const denApl = sumMetrosTotal - sumVendasQtde
    return denApl !== 0 && denVar !== 0
      ? safeDivide(denVarFat - sumVendasTotal, denApl)
      : 0
  })()

  const qtdeEstqNum = qtdeEstq === 'S/ ESTOQUE' ? 0 : safe(qtdeEstq)

  const lucroVariavel = (() => {
    if (pcRestante === 0) return sumVendasTotal - sumCustoTotal
    if (precoAplicarVar === 0) return sumVendasTotal - sumCustoTotal
    return (sumVendasTotal + (precoAplicarVar * qtdeEstqNum)) - sumCustoTotal
  })()

  const precoVendaVar: number | 'S/ESTOQUE' = (() => {
    if (pcRestante === 0) return 'S/ESTOQUE'
    const denApl = sumMetrosTotal - sumVendasQtde
    if (denApl === 0) return precoSemLucro
    const candidato = denVar !== 0
      ? safeDivide(denVarFat - sumVendasTotal, denApl)
      : 0
    return candidato < precoSemLucro ? precoSemLucro : candidato
  })()

  return {
    pcRestante,
    pdrPrecoM2: safe(pdrPrecoM2),
    pdrFaturado: safe(pdrFaturado),
    pdrLucro: safe(pdrLucro),
    qtdeEstq,
    precoSemLucro: safe(precoSemLucro),
    precoAplicar: safe(precoAplicar),
    lucroVariavel: safe(lucroVariavel),
    precoVendaVar: precoVendaVar === 'S/ESTOQUE' ? 'S/ESTOQUE' : safe(precoVendaVar),
  }
}

const DEFAULT_VAR_LUCRO = 0.30

function CardSkeleton() {
  return (
    <div className="rounded-lg bg-surface border border-surface-border p-3 flex flex-col gap-1.5">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-2.5 w-14" />
    </div>
  )
}

interface InfoCardProps {
  title:     string
  value:     string
  subtitle?: string
  icon:      React.ElementType
  accent?:   string
  loading?:  boolean
  highlight?: boolean
}

const InfoCard = memo(function InfoCard({
  title, value, subtitle, icon: Icon, accent = 'text-brand', loading, highlight,
}: InfoCardProps) {
  if (loading) return <CardSkeleton />
  return (
    <div className={cn(
      'rounded-lg bg-surface border border-surface-border p-3 flex flex-col gap-0.5 min-w-0',
      highlight && 'border-brand/30 bg-brand/5',
    )}>
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider truncate leading-tight">
          {title}
        </p>
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', `${accent.replace('text-', 'bg-')}/15`)}>
          <Icon size={12} className={accent} strokeWidth={1.5} />
        </div>
      </div>
      <p className={cn('font-bold tabular-nums leading-snug text-xl truncate', accent)}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px] text-text-muted leading-tight">{subtitle}</p>
      )}
    </div>
  )
})

interface LucroSliderProps {
  value:     number
  onChange:  (v: number) => void
  disabled?: boolean
}

const LucroSlider = memo(function LucroSlider({ value, onChange, disabled }: LucroSliderProps) {
  const pct = +(value * 100).toFixed(2)

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Math.max(Number(e.target.value), 0), 100)
    onChange(v / 100)
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.')
    const v   = parseFloat(raw)
    if (!isNaN(v)) onChange(Math.min(Math.max(v, 0), 100) / 100)
  }

  return (
    <div className="rounded-lg bg-surface border border-surface-border p-3 flex flex-col gap-1 min-w-0 h-full">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
          % DE LUCRO
        </p>
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-chart-purple/15">
          <Percent size={12} className="text-chart-purple" strokeWidth={1.5} />
        </div>
      </div>
      <div className="flex justify-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={pct}
          onChange={handleInput}
          disabled={disabled}
          className={cn(
            'w-14 bg-surface-light border border-surface-border rounded-md px-1.5 py-0.5',
            'text-sm font-semibold tabular-nums text-white text-right',
            'focus:outline-none focus:border-brand/50',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
        <span className="text-sm font-semibold text-white">%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={0.01}
        value={pct}
        onChange={handleSlider}
        disabled={disabled}
        className={cn(
          'w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        style={{
          background: `linear-gradient(to right, var(--color-brand, #00d4aa) ${pct}%, #2d3554 ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-[8px] text-text-muted">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
    </div>
  )
})

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
  if (sort.dir === 'asc')  return <ChevronUp  size={9} className="inline-block text-brand ml-0.5" />
  if (sort.dir === 'desc') return <ChevronDown size={9} className="inline-block text-brand ml-0.5" />
  return null
}

const MATRIZ_COLS: { key: keyof SimuladorMatrizRow; label: string; fmt: (v: number) => string }[] = [
  { key: 'vendidas',    label: 'Vendidas',      fmt: fmtInt },
  { key: 'pc',          label: 'PC',            fmt: fmtInt },
  { key: 'pcRestante',  label: 'PC Rest.',      fmt: fmtInt },
  { key: 'compra',      label: 'Compra',        fmt: fmtBRL },
  { key: 'frete',       label: 'Frete',         fmt: fmtBRL },
  { key: 'serrada',     label: 'Serrada',       fmt: fmtBRL },
  { key: 'polimento',   label: 'Polimento',     fmt: fmtBRL },
  { key: 'outCustos',   label: 'Out.Custos',    fmt: fmtBRL },
  { key: 'outDesp',     label: 'Out.Desp.',     fmt: fmtBRL },
  { key: 'servicos',    label: 'Serviços',      fmt: fmtBRL },
  { key: 'custoTotal',  label: 'Custo Total',   fmt: fmtBRL },
  { key: 'metrosTotal', label: 'Metros',        fmt: fmtNum },
  { key: 'custoM2',     label: 'Custo M²',      fmt: fmtBRL },
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
      ? g.totals.custoTotal / g.totals.metrosTotal
      : 0
  }
  return Array.from(map.values())
}

interface MatrizProps {
  rows:       SimuladorMatrizRow[]
  loading:    boolean
  filtros:    SimuladorFiltros
  setFiltros: (p: Partial<SimuladorFiltros>) => void
}

const MatrizMateriais = memo(function MatrizMateriais({ rows, loading, filtros, setFiltros }: MatrizProps) {
  const { sort, toggle } = useSortState()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())



  const toggleExpand = useCallback((codMa: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(codMa) ? next.delete(codMa) : next.add(codMa)
      return next
    })
  }, [])

  const toggleMatFilter = useCallback((codMa: number) => {
    const arr = filtros.materiais
    setFiltros({ materiais: arr.includes(codMa) ? arr.filter(v => v !== codMa) : [...arr, codMa] })
  }, [filtros.materiais, setFiltros])

  const toggleBlocoFilter = useCallback((nBloco: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const arr = filtros.blocos
    setFiltros({ blocos: arr.includes(nBloco) ? arr.filter(v => v !== nBloco) : [...arr, nBloco] })
  }, [filtros.blocos, setFiltros])

  const groups = useMemo(() => {
    const gs = buildMatrizGroups(rows)
    if (!sort.col || !sort.dir) return gs
    return [...gs].sort((a, b) => {
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
  }, [rows, sort])

  const totais = useMemo(() => {
    const sum = (key: keyof SimuladorMatrizRow) => rows.reduce((s, r) => s + (r[key] as number), 0)
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

  const COL_MAT   = 180
  const COL_BLOCO = 72

  const thBase = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap text-right cursor-pointer select-none group hover:text-text-primary transition-colors'
  const thLeft = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap text-left cursor-pointer select-none group hover:text-text-primary transition-colors'
  const tdBase = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right text-text-primary whitespace-nowrap'
  const tdLeft = 'px-2.5 py-1.5 text-[11px] text-left text-text-primary whitespace-nowrap'

  return (
    <div className="overflow-x-auto">
      <table className="min-w-max w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface-light">
          <tr className="border-b border-surface-border">
            <th
              className={cn(thLeft, 'sticky left-0 z-20 bg-surface-light')}
              style={{ minWidth: COL_MAT }}
              onClick={() => toggle('material')}
            >
              Material <SortIcon col="material" sort={sort} />
            </th>
            <th
              className={cn(thBase, 'sticky z-20 bg-surface-light')}
              style={{ minWidth: COL_BLOCO, left: COL_MAT }}
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
          {groups.map((g) => {
            const isExp      = expanded.has(g.codMa)
            const isMatActive = filtros.materiais.includes(g.codMa)

            return [
              <tr
                key={`mat-${g.codMa}`}
                className={cn(
                  'border-b border-surface-border/40 cursor-pointer select-none transition-colors',
                  isMatActive
                    ? 'bg-brand/10 hover:bg-brand/15'
                    : 'bg-surface-light/20 hover:bg-surface-light/60',
                )}
                onClick={() => toggleMatFilter(g.codMa)}
              >
                <td
                  className={cn(tdLeft, 'sticky left-0 z-[5] font-semibold',
                    isMatActive ? 'bg-brand/10 text-brand' : 'bg-surface-light/60 text-text-primary',
                  )}
                  style={{ minWidth: COL_MAT }}
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={e => { e.stopPropagation(); toggleExpand(g.codMa) }}
                      className="shrink-0 text-text-muted hover:text-brand transition-colors"
                    >
                      {isExp
                        ? <ChevronDown size={12} />
                        : <ChevronRight size={12} />
                      }
                    </button>
                    <span className="truncate">{g.material}</span>
                    <span className="text-[9px] text-text-muted/60 shrink-0">({g.rows.length})</span>
                  </div>
                </td>
                <td
                  className={cn(tdBase, 'sticky z-[5] text-text-muted',
                    isMatActive ? 'bg-brand/10' : 'bg-surface-light/60',
                  )}
                  style={{ minWidth: COL_BLOCO, left: COL_MAT }}
                >
                  —
                </td>
                {MATRIZ_COLS.map(c => (
                  <td
                    key={c.key}
                    className={cn(tdBase, 'font-medium',
                      c.key === 'pcRestante' && (g.totals as Record<string, number>)[c.key] < 0
                        ? 'text-status-danger'
                        : isMatActive ? 'text-text-primary' : '',
                    )}
                  >
                    {c.fmt((g.totals as Record<string, number>)[c.key] ?? 0)}
                  </td>
                ))}
              </tr>,

              ...(isExp ? g.rows.map((row) => {
                const isBlocoActive = filtros.blocos.includes(row.nBloco)
                return (
                  <tr
                    key={`bloco-${g.codMa}-${row.nBloco}`}
                    className={cn(
                      'border-b border-surface-border/20 cursor-pointer select-none transition-colors',
                      isBlocoActive
                        ? 'bg-chart-blue/10 hover:bg-chart-blue/15'
                        : 'hover:bg-surface-light/30',
                    )}
                    onClick={e => toggleBlocoFilter(row.nBloco, e)}
                  >
                    <td
                      className={cn(tdLeft, 'sticky left-0 z-[5] pl-7 text-text-muted text-[11px]',
                        isBlocoActive ? 'bg-chart-blue/10' : 'bg-surface',
                      )}
                      style={{ minWidth: COL_MAT }}
                    >
                      <span className="text-text-muted/40 mr-1">└</span>
                      {row.material}
                    </td>
                    <td
                      className={cn(tdBase, 'sticky z-[5] font-medium',
                        isBlocoActive ? 'bg-chart-blue/10 text-chart-blue' : 'bg-surface text-text-muted',
                      )}
                      style={{ minWidth: COL_BLOCO, left: COL_MAT }}
                    >
                      {row.nBloco}
                    </td>
                    {MATRIZ_COLS.map(c => (
                      <td
                        key={c.key}
                        className={cn(tdBase,
                          c.key === 'pcRestante' && row.pcRestante < 0 ? 'text-status-danger' : '',
                        )}
                      >
                        {c.fmt(row[c.key] as number)}
                      </td>
                    ))}
                  </tr>
                )
              }) : []),
            ]
          })}
        </tbody>

        <tfoot className="sticky bottom-0 z-[5] bg-surface-light border-t-2 border-surface-border">
          <tr>
            <td className={cn(tdLeft, 'sticky left-0 z-20 bg-surface-light font-semibold text-brand')} style={{ minWidth: COL_MAT }}>
              TOTAL
            </td>
            <td className={cn(tdBase, 'sticky z-20 bg-surface-light')} style={{ minWidth: COL_BLOCO, left: COL_MAT }}>—</td>
            {MATRIZ_COLS.map(c => (
              <td key={c.key} className={cn(tdBase, 'font-semibold text-brand')}>
                {c.fmt((totais as Record<string, number>)[c.key] ?? 0)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
})

interface VendasTableProps {
  rows:       SimuladorVendaRow[]
  loading:    boolean
  filtros:    SimuladorFiltros
  setFiltros: (p: Partial<SimuladorFiltros>) => void
}

const VENDAS_COLS: { key: keyof SimuladorVendaRow; label: string; right?: boolean; fmt?: (v: never) => string }[] = [
  { key: 'material', label: 'Material',  right: false },
  { key: 'nPedido',  label: 'Pedido',    right: false },
  { key: 'bloco',    label: 'Bloco',     right: true,  fmt: v => String(v) },
  { key: 'pc',       label: 'PC',        right: true,  fmt: v => fmtInt(Number(v)) },
  { key: 'qtde',     label: 'QTDE',      right: true,  fmt: v => fmtNum(Number(v)) },
  { key: 'un',       label: 'UN',        right: false },
  { key: 'preco',    label: 'Preço',     right: true,  fmt: v => fmtBRL(Number(v)) },
  { key: 'total',    label: 'Total',     right: true,  fmt: v => fmtBRL(Number(v)) },
  { key: 'vendedor', label: 'Vendedor',  right: false },
  { key: 'cliente',  label: 'Cliente',   right: false },
]

interface VendaAgrupada {
  material: string
  pc:       number
  qtde:     number
  total:    number
  count:    number
}

function agruparVendasPorMaterial(rows: SimuladorVendaRow[]): VendaAgrupada[] {
  const map = new Map<string, VendaAgrupada>()
  for (const r of rows) {
    const g = map.get(r.material) ?? { material: r.material, pc: 0, qtde: 0, total: 0, count: 0 }
    g.pc    += r.pc
    g.qtde  += r.qtde
    g.total += r.total
    g.count += 1
    map.set(r.material, g)
  }
  return Array.from(map.values())
}

const VendasTable = memo(function VendasTable({ rows, loading, filtros, setFiltros }: VendasTableProps) {
  const { sort, toggle } = useSortState()
  const [groupBy, setGroupBy] = useState(false)

    console.log("hhh")

  const toggleBlocoFilter = useCallback((nBloco: number) => {
    const arr = filtros.blocos
    setFiltros({ blocos: arr.includes(nBloco) ? arr.filter(v => v !== nBloco) : [...arr, nBloco] })
  }, [filtros.blocos, setFiltros])

  const sorted = useMemo(() => {
    if (!sort.col || !sort.dir) return rows
    return [...rows].sort((a, b) => {
      const av = a[sort.col as keyof SimuladorVendaRow]
      const bv = b[sort.col as keyof SimuladorVendaRow]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av
      }
      const as = String(av ?? '').toLowerCase()
      const bs = String(bv ?? '').toLowerCase()
      return sort.dir === 'asc' ? as.localeCompare(bs, 'pt-BR') : bs.localeCompare(as, 'pt-BR')
    })
  }, [rows, sort])

  const agrupados = useMemo(() => agruparVendasPorMaterial(sorted), [sorted])

  const { totalPC, totalQtde, totalValor } = useMemo(() => ({
    totalPC:    rows.reduce((s, r) => s + r.pc,    0),
    totalQtde:  rows.reduce((s, r) => s + r.qtde,  0),
    totalValor: rows.reduce((s, r) => s + r.total, 0),
  }), [rows])

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

  const thBase = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none group hover:text-text-primary transition-colors whitespace-nowrap'
  const tdBase = 'px-2.5 py-1.5 text-[11px] text-text-primary whitespace-nowrap'

  return (
    <div>
      <div className="px-3 py-1.5 border-b border-surface-border/40 flex items-center gap-2">
        <button
          onClick={() => setGroupBy(v => !v)}
          className={cn(
            'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[10px] font-medium transition-all border',
            groupBy
              ? 'bg-brand/15 border-brand/30 text-brand'
              : 'border-surface-border text-text-muted hover:text-text-primary hover:border-surface-border/80',
          )}
        >
          <Layers size={10} />
          {groupBy ? 'Agrupado por Material' : 'Agrupar por Material'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-max w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface-light">
            <tr className="border-b border-surface-border">
              {groupBy ? (
                <>
                  <th className={cn(thBase, 'text-left')}>Material</th>
                  <th className={cn(thBase, 'text-right')}>PC</th>
                  <th className={cn(thBase, 'text-right')}>QTDE</th>
                  <th className={cn(thBase, 'text-right')}>Total</th>
                  <th className={cn(thBase, 'text-right')}>Pedidos</th>
                </>
              ) : (
                VENDAS_COLS.map(c => (
                  <th
                    key={c.key}
                    className={cn(thBase, c.right ? 'text-right' : 'text-left')}
                    onClick={() => toggle(c.key)}
                  >
                    {c.label} <SortIcon col={c.key} sort={sort} />
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {groupBy ? (
              agrupados.map((g, i) => (
                <tr
                  key={g.material}
                  className={cn(
                    'border-b border-surface-border/30 transition-colors',
                    i % 2 === 0 ? '' : 'bg-surface-light/10',
                  )}
                >
                  <td className={cn(tdBase, 'text-left font-medium')}>{g.material}</td>
                  <td className={cn(tdBase, 'text-right tabular-nums')}>{fmtInt(g.pc)}</td>
                  <td className={cn(tdBase, 'text-right tabular-nums')}>{fmtNum(g.qtde)}</td>
                  <td className={cn(tdBase, 'text-right tabular-nums')}>{fmtBRL(g.total)}</td>
                  <td className={cn(tdBase, 'text-right tabular-nums text-text-muted')}>{g.count}</td>
                </tr>
              ))
            ) : (
              sorted.map((row, i) => {
                const isBlocoActive = filtros.blocos.includes(row.bloco)
                return (
                  <tr
                    key={`${row.nPedido}-${i}`}
                    className={cn(
                      'border-b border-surface-border/30 cursor-pointer select-none transition-colors',
                      isBlocoActive
                        ? 'bg-brand/10 hover:bg-brand/15'
                        : i % 2 === 0 ? 'hover:bg-surface-light/40' : 'bg-surface-light/10 hover:bg-surface-light/40',
                    )}
                    onClick={() => toggleBlocoFilter(row.bloco)}
                  >
                    {VENDAS_COLS.map(c => {
                      const raw  = row[c.key]
                      const text = c.fmt ? c.fmt(raw as never) : String(raw ?? '')
                      return (
                        <td
                          key={c.key}
                          className={cn(tdBase, c.right ? 'text-right tabular-nums' : 'text-left',
                            c.key === 'bloco' && isBlocoActive ? 'text-brand font-semibold' : '',
                          )}
                        >
                          {text}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>

          <tfoot className="sticky bottom-0 bg-surface-light border-t-2 border-surface-border">
            <tr>
              {groupBy ? (
                <>
                  <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand">TOTAL</td>
                  <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand text-right tabular-nums">{fmtInt(totalPC)}</td>
                  <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand text-right tabular-nums">{fmtNum(totalQtde)}</td>
                  <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand text-right tabular-nums">{fmtBRL(totalValor)}</td>
                  <td className="px-2.5 py-1.5 text-[11px] text-text-muted text-right">{rows.length}</td>
                </>
              ) : (
                <>
                  <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand">TOTAL</td>
                  <td className="px-2.5 py-1.5" />
                  <td className="px-2.5 py-1.5" />
                  <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand text-right tabular-nums">{fmtInt(totalPC)}</td>
                  <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand text-right tabular-nums">{fmtNum(totalQtde)}</td>
                  <td className="px-2.5 py-1.5" />
                  <td className="px-2.5 py-1.5" />
                  <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand text-right tabular-nums">{fmtBRL(totalValor)}</td>
                  <td className="px-2.5 py-1.5" />
                  <td className="px-2.5 py-1.5" />
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
})

interface FiltroBarProps {
  filtros:      SimuladorFiltros
  setFiltros:   (p: Partial<SimuladorFiltros>) => void
  resetFiltros: () => void
  disponiveis?: { materiais: { id: number; label: string }[]; blocos: number[] }
  loading?:     boolean
}

const FiltroBar = memo(function FiltroBar({
  filtros, setFiltros, resetFiltros, disponiveis, loading,
}: FiltroBarProps) {
  const materiais  = disponiveis?.materiais ?? []
  const blocos     = (disponiveis?.blocos ?? []).map(b => ({ id: b, label: String(b) }))
  const hasActive  = filtros.materiais.length > 0 || filtros.blocos.length > 0
  const activeCount = filtros.materiais.length + filtros.blocos.length

  return (
    <div className="rounded-xl bg-surface border border-surface-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-text-muted shrink-0">
          <SlidersHorizontal size={14} />
          <span className="text-[11px] font-medium uppercase tracking-wider">Filtros</span>
          {hasActive && (
            <span className="bg-brand/15 text-brand text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <MultiSelect
            label="Material"
            options={materiais}
            selected={filtros.materiais}
            onChange={ids => setFiltros({ materiais: ids })}
            placeholder="Todos"
            loading={loading}
          />
          <MultiSelect
            label="Nº Bloco"
            options={blocos}
            selected={filtros.blocos}
            onChange={ids => setFiltros({ blocos: ids })}
            placeholder="Todos"
            loading={loading}
          />
        </div>
        {hasActive && (
          <button
            onClick={resetFiltros}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs border border-status-danger/30 text-status-danger/70 hover:text-status-danger hover:border-status-danger/60 transition-all shrink-0"
          >
            <RefreshCw size={11} />
            Limpar
          </button>
        )}
      </div>
    </div>
  )
})

export function SimuladorPage() {
  const { filtros, setFiltros, resetFiltros } = useSimuladorStore()

  const { data: filtrosDisp, isLoading: filtrosLoading } = useSimuladorFiltrosDisponiveis()
  const { data: matrizData,  isLoading: matrizLoading }  = useSimuladorMatriz()
  const { data: vendasData,  isLoading: vendasLoading }  = useSimuladorVendas()
  const { data: resumoData,  isLoading: resumoLoading }  = useSimuladorResumo()

  const [varLucro, setVarLucro] = useState(DEFAULT_VAR_LUCRO)
  const didInitLucro = useRef(false)
  console.log("a")

  useEffect(() => {
    if (!didInitLucro.current && resumoData && resumoData.maxLucro > 0) {
      setVarLucro(resumoData.maxLucro)
      didInitLucro.current = true
      
    }
 }, [resumoData])

  const matrizRows = matrizData?.rows ?? []
  const vendasRows = vendasData?.rows ?? []

  const calcs = useMemo<SimuladorCalcs | null>(() => {
    if (!resumoData) return null
    return calcSimulador(resumoData, varLucro)
  }, [resumoData, varLucro])

  const r = resumoData

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">
      <FiltroBar
        filtros={filtros}
        setFiltros={setFiltros}
        resetFiltros={resetFiltros}
        disponiveis={filtrosDisp}
        loading={filtrosLoading}
      />

      {/* BLOCO 1 */}
     <ErrorBoundary>
        <Card noPadding>
          <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2">
            <Package size={12} className="text-brand" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
              Materiais (Disponíveis)
            </h2>
          </div>
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
            <MatrizMateriais
              rows={matrizRows}
              loading={matrizLoading}
              filtros={filtros}
              setFiltros={setFiltros}
            />
          </div>
        </Card>
      </ErrorBoundary>

      {/* BLOCO 2 */}
      {/* <ErrorBoundary>
        <Card noPadding>
          <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2">
            <TrendingUp size={12} className="text-brand" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
              Total Realizado (Vendas Realizadas)
            </h2>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            <VendasTable
              rows={vendasRows}
              loading={vendasLoading}
              filtros={filtros}
              setFiltros={setFiltros}
            />
          </div>
        </Card>
      </ErrorBoundary>  */}

      {/* BLOCOS 3-6 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

        {/* BLOCO 3 */}
        
        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                Simulador (Custos lançados + Indicadores)
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <InfoCard
                title="Preço M²"
                value={calcs === null ? '—' : fmtBRL(calcs.pdrPrecoM2)}
                icon={DollarSign}
                accent="text-brand"
                loading={resumoLoading}
                highlight
              />
              <InfoCard
                title="Faturado"
                value={calcs === null ? '—' : fmtBRL(calcs.pdrFaturado)}
                icon={BarChart2}
                accent="text-chart-teal"
                loading={resumoLoading}
              />
              <InfoCard
                title="Lucro"
                value={calcs === null ? '—' : fmtBRL(calcs.pdrLucro)}
                icon={TrendingUp}
                accent={calcs && calcs.pdrLucro >= 0 ? 'text-status-success' : 'text-status-danger'}
                loading={resumoLoading}
              />
            </div>
          </Card>
        </ErrorBoundary>

        {/* BLOCO 4 */}
        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Target size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                Indicadores (Cadastro da Empresa)
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <InfoCard
                title="Lucro"
                value={r ? fmtPct(r.maxLucro) : '—'}
                icon={TrendingUp}
                accent="text-chart-teal"
                loading={resumoLoading}
              />
              <InfoCard
                title="D. Variável"
                value={r ? fmtPct(r.maxDvariavel) : '—'}
                icon={Percent}
                accent="text-chart-blue"
                loading={resumoLoading}
              />
              <InfoCard
                title="D. Fixa"
                value={r ? fmtPct(r.maxDfixa) : '—'}
                icon={Percent}
                accent="text-chart-orange"
                loading={resumoLoading}
              />
            </div>
          </Card>
        </ErrorBoundary>

        {/* BLOCO 5 */}
        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                Simulador de Valores
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <InfoCard
                title="Lucro (Variável)"
                value={calcs === null ? '—' : fmtBRL(calcs.lucroVariavel)}
                icon={TrendingUp}
                accent={calcs && calcs.lucroVariavel >= 0 ? 'text-status-success' : 'text-status-danger'}
                loading={resumoLoading}
              />
              <InfoCard
                title="Preço de Venda (Variável)"
                value={
                  calcs === null
                    ? '—'
                    : calcs.precoVendaVar === 'S/ESTOQUE'
                      ? 'S/ESTOQUE'
                      : fmtBRL(calcs.precoVendaVar)
                }
                icon={DollarSign}
                accent="text-chart-teal"
                loading={resumoLoading}
                highlight={calcs?.precoVendaVar !== 'S/ESTOQUE'}
              />
              <LucroSlider
                value={varLucro}
                onChange={setVarLucro}
                disabled={resumoLoading}
              />
            </div>
          </Card>
        </ErrorBoundary>

        {/* BLOCO 6 */}
        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                Recuperação do Valor do Material
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <InfoCard
                title="Qtde em Estq"
                value={
                  calcs === null
                    ? '—'
                    : calcs.qtdeEstq === 'S/ ESTOQUE'
                      ? 'S/ ESTOQUE'
                      : fmtNum(calcs.qtdeEstq)
                }
                subtitle={calcs?.qtdeEstq === 'S/ ESTOQUE' ? 'PCs todos vendidos' : undefined}
                icon={Package}
                accent={
                  calcs?.qtdeEstq === 'S/ ESTOQUE'
                    ? 'text-text-muted'
                    : typeof calcs?.qtdeEstq === 'number' && calcs.qtdeEstq < 0
                      ? 'text-status-danger'
                      : 'text-chart-blue'
                }
                loading={resumoLoading}
              />
              <InfoCard
                title="Preço S/ Lucro"
                value={calcs === null ? '—' : fmtBRL(calcs.precoSemLucro)}
                subtitle="Ponto de equilíbrio"
                icon={DollarSign}
                accent="text-chart-orange"
                loading={resumoLoading}
              />
              <InfoCard
                title="Preço a Aplicar"
                value={
                  calcs === null
                    ? '—'
                    : calcs.precoAplicar === 0
                      ? 'S/ ESTOQUE'
                      : fmtBRL(calcs.precoAplicar)
                }
                subtitle={calcs?.precoAplicar === 0 ? 'Sem peças restantes' : 'Para atingir meta'}
                icon={Target}
                accent="text-brand"
                loading={resumoLoading}
                highlight={!!(calcs && calcs.precoAplicar > 0)}
              />
            </div>
          </Card>
        </ErrorBoundary>

      </div>
    </div>
  )
}
