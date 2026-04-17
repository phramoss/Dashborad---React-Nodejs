import { memo, useMemo, useState, useCallback, useRef, useEffect, useTransition } from 'react'
import {
  SlidersHorizontal, RefreshCw, BarChart2, TrendingUp,
  ChevronUp, ChevronDown, ChevronRight, Package, DollarSign, Percent,
  Calculator, Target, AlertCircle, ShoppingCart, Trash2, Plus, Search, Filter, Settings,Layers,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import { useSimuladorStore } from '@/store/simulador.store'
import {
  useSimuladorFiltrosDisponiveis,
  useSimuladorAll,
} from '@/hooks/useSimuladorData'
import type {
  SimuladorFiltros,
  SimuladorMatrizRow,
  SimuladorChapaRow,
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

function calcSimulador(r: SimuladorResumo, varLucro: number, dvariavel?: number, dfixa?: number): SimuladorCalcs {
  const {
    sumCustoTotal, sumMetrosTotal, sumPcBloco,
    maxDfixa: _maxDfixa, maxDvariavel: _maxDvariavel, maxLucro,
    sumVendasTotal, sumVendasPc, sumVendasQtde,
  } = r
  const maxDfixa    = dfixa    !== undefined ? dfixa    : _maxDfixa
  const maxDvariavel = dvariavel !== undefined ? dvariavel : _maxDvariavel

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

const TRIG = 'h-8 text-[11px] min-w-[120px]'

const SITUACAO_OPTIONS = [
  { id: 1, label: 'DISPONIVEL' },
  { id: 2, label: 'RESERVADO' },
  { id: 3, label: 'VENDIDO' },
]
function sitToIds(sit: string[]): number[] {
  return sit.map(v => SITUACAO_OPTIONS.find(o => o.label === v)?.id ?? 0).filter(Boolean)
}
function idsToSit(ids: number[]): string[] {
  return ids.map(id => SITUACAO_OPTIONS.find(o => o.id === id)?.label ?? '').filter(Boolean)
}

interface PedidoItem {
  chapaKey:    string   // `${nBloco}-${chapa}`
  nBloco:      number
  chapa:       number
  codMa:       number
  material:    string
  pc:          number
  metrosTotal: number
  custoTotal:  number
  custoM2:     number
  qtde:        number   // m² ajustável — padrão = metrosTotal
  desconto:    number   // desconto em valor (R$)
}

function calcPedidoItem(item: PedidoItem, dfixa: number, dvariavel: number, varLucro: number) {
  const den0 = 1 - dfixa - dvariavel
  const denV = 1 - dfixa - dvariavel - varLucro
  const precoSemLucroM2    = den0 !== 0 ? item.custoM2 / den0 : 0
  const precoComLucroM2    = denV !== 0 ? item.custoM2 / denV : 0
  const valorBruto         = precoComLucroM2 * item.qtde
  const valorTotal         = valorBruto - item.desconto
  const custoQtde          = item.custoM2 * item.qtde
  const lucro              = valorTotal - custoQtde
  const descontoPct          = valorBruto > 0 ? (item.desconto / valorBruto) * 100 : 0
  // effective price/m² after discount
  const precoComLucroM2Final = item.qtde > 0 ? valorTotal / item.qtde : 0
  // % lucro: only varLucro portion minus discount (excludes dfixa/dvariavel spread)
  // no discount → exactly varLucro * 100; with discount → decreases proportionally
  const lucroFinalPct = valorTotal > 0
    ? ((varLucro * valorBruto - item.desconto) / valorTotal) * 100
    : 0
  return {
    precoSemLucroM2:     safe(precoSemLucroM2),
    precoComLucroM2:     safe(precoComLucroM2),
    precoComLucroM2Final:safe(precoComLucroM2Final),
    valorBruto:          safe(valorBruto),
    valorTotal:          safe(valorTotal),
    lucro:               safe(lucro),
    lucroFinalPct:       safe(lucroFinalPct),
    descontoPct:         safe(descontoPct),
  }
}

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
      'rounded-lg "#428D94" border  p-3 flex flex-col gap-0.5 min-w-0 h-full',
      highlight && 'border-brand/30 bg-brand/5',
    )}>
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[8px] sm:text-[10px] font-medium text-text-muted uppercase tracking-wider truncate leading-tight">
          {title}
        </p>
        <div className={cn('w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0', `${accent.replace('text-', 'bg-')}/15`)}>
          <Icon size={11} className={accent} strokeWidth={1.5} />
        </div>
      </div>
      <p className={cn('font-bold tabular-nums leading-snug text-base sm:text-xl truncate', accent)}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[8px] sm:text-[10px] text-text-muted leading-tight">{subtitle}</p>
      )}
    </div>
  )
})

interface LucroSliderProps {
  value:     number
  onChange:  (v: number) => void
  disabled?: boolean
  label?:    string
}

const LucroSlider = memo(function LucroSlider({ value, onChange, disabled, label }: LucroSliderProps) {
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
    <div className="rounded-lg '#428D94' border '#428D94' p-3 flex flex-col gap-1 min-w-0 h-full">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
          {label ?? '% DE LUCRO'}
        </p>
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-chart-orange/15">
          <Percent size={12} className="text-chart-orange" strokeWidth={1.5} />
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

// ─── constants hoisted for memoized row components ──────────────────────────
const MTRZ_COL_MAT   = 180
const MTRZ_COL_BLOCO = 72
const MTRZ_TD_BASE   = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right text-text-primary whitespace-nowrap'
const MTRZ_TD_LEFT   = 'px-2.5 py-1.5 text-[11px] text-left text-text-primary whitespace-nowrap'

const MatrizGroupRow = memo(function MatrizGroupRow({ group: g, isActive, isExpanded: isExp, onToggleExpand, onToggleFilter }: {
  group: MaterialGroup; isActive: boolean; isExpanded: boolean
  onToggleExpand: (codMa: number) => void; onToggleFilter: (codMa: number) => void
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

interface MatrizProps {
  rows:             SimuladorMatrizRow[]
  loading:          boolean
  filtrosMateriais: number[]
  filtrosBlocos:    number[]
  setFiltros:       (p: Partial<SimuladorFiltros>) => void
  maxHeight?:       number
}

const MatrizMateriais = memo(function MatrizMateriais({
  rows, loading, filtrosMateriais, filtrosBlocos, setFiltros, maxHeight,
}: MatrizProps) {
  const { sort, toggle } = useSortState()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // Refs keep current filter values accessible in stable callbacks so memo
  // on row components isn't broken by callback recreation on every render.
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

  // Sets for O(1) active-state lookups per row
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
    <div
      className="overflow-x-auto overflow-y-auto"
      style={{ maxHeight: maxHeight ?? 280 }}
    >
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
          {sortedGroups.map((g) => {
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

interface VendasTableProps {
  rows:       SimuladorVendaRow[]
  loading:    boolean
  maxHeight?: number
}

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

const VendasTable = memo(function VendasTable({ rows, loading, maxHeight }: VendasTableProps) {
  const MAX_ROWS = 500
  const limitedRows = useMemo(() => rows.slice(0, MAX_ROWS), [rows])
  const grupos = useMemo(() => buildVendasGrupos(limitedRows), [limitedRows])
  const { totalPC, totalQtde, totalValor } = useMemo(() => ({
    totalPC:    limitedRows.reduce((s, r) => s + r.pc,    0),
    totalQtde:  limitedRows.reduce((s, r) => s + r.qtde,  0),
    totalValor: limitedRows.reduce((s, r) => s + r.total, 0),
  }), [limitedRows])

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
    <div
      className="overflow-x-auto overflow-y-auto"
      style={{ maxHeight: maxHeight ?? 240 }}
    >
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
          {grupos.map(g => {
            const isExp = expanded.has(g.material)
            return [
              <VGrupoRow key={`g-${g.material}`} grupo={g} isExp={isExp} onToggle={toggleGrupo} />,
              ...(isExp ? g.rows.map(r => (
                <VPedidoRow key={`p-${r.nPedido}-${r.bloco}`} r={r} />
              )) : []),
            ]
          })}
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

// ─── Pedido / Chapas Selecionadas ────────────────────────────────────────────

const INPUT_CLS = 'bg-surface-light border border-surface-border rounded px-1.5 py-0.5 text-[11px] tabular-nums text-right text-white focus:outline-none focus:border-brand/50'

const PedidoRowItem = memo(function PedidoRowItem({ item, dfixa, dvariavel, varLucro, onRemove, onUpdateQtde, onUpdateDesconto }: {
  item: PedidoItem; dfixa: number; dvariavel: number; varLucro: number
  onRemove:         (chapaKey: string) => void
  onUpdateQtde:     (chapaKey: string, v: number) => void
  onUpdateDesconto: (chapaKey: string, v: number) => void
}) {
  const calcs = useMemo(
    () => calcPedidoItem(item, dfixa, dvariavel, varLucro),
    [item, dfixa, dvariavel, varLucro],
  )
  const handleQtdeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value.replace(',', '.'))
    if (!isNaN(v) && v >= 0) onUpdateQtde(item.chapaKey, v)
  }, [item.chapaKey, onUpdateQtde])
  const handleDescontoValorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value.replace(',', '.'))
    if (!isNaN(v) && v >= 0) onUpdateDesconto(item.chapaKey, v)
  }, [item.chapaKey, onUpdateDesconto])
  const handleDescontoPctChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value.replace(',', '.'))
    if (!isNaN(pct) && pct >= 0 && pct <= 100) {
      onUpdateDesconto(item.chapaKey, calcs.valorBruto * pct / 100)
    }
  }, [item.chapaKey, onUpdateDesconto, calcs.valorBruto])
  const handleRemove = useCallback(() => onRemove(item.chapaKey), [item.chapaKey, onRemove])

  const td  = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right text-text-primary whitespace-nowrap'
  const tdL = 'px-2.5 py-1.5 text-[11px] text-left text-text-primary whitespace-nowrap'
  return (
    <tr className="border-b border-[var(--line)] hover:bg-surface-light/20 transition-colors">
      <td className={cn(tdL, 'font-medium')}>{item.material}</td>
      <td className={cn(td, 'text-[color:var(--color-chart-orange,#f97316)] font-semibold')}>{item.nBloco}</td>
      <td className={cn(td, 'text-text-muted')}>{item.chapa}</td>
      <td className={td}>{fmtInt(item.pc)}</td>
      <td className="px-2.5 py-1 text-right">
        <input type="number" min={0} step={0.01} value={+item.qtde.toFixed(2)} onChange={handleQtdeChange} className={cn(INPUT_CLS, 'w-20')} />
      </td>
      <td className={cn(td, 'text-text-muted')}>{fmtBRL(calcs.precoSemLucroM2)}</td>
      <td className={cn(td, 'text-brand font-medium')}>{fmtBRL(calcs.precoComLucroM2Final)}</td>
      <td className={cn(td, calcs.lucro >= 0 ? 'text-status-success' : 'text-status-danger', 'font-medium')}>{fmtBRL(calcs.lucro)}</td>
      <td className={cn(td, calcs.lucroFinalPct >= 0 ? 'text-status-success' : 'text-status-danger', 'font-medium')}>{fmtPct(calcs.lucroFinalPct / 100)}</td>
      <td className={cn(td, 'text-status-success font-semibold')}>{fmtBRL(calcs.valorTotal)}</td>
      <td className="px-2.5 py-1 text-right">
        <input type="number" min={0} step={0.01} value={+item.desconto.toFixed(2)} onChange={handleDescontoValorChange} className={cn(INPUT_CLS, 'w-20')} />
      </td>
      <td className="px-2.5 py-1 text-right">
        <input type="number" min={0} max={100} step={0.01} value={+calcs.descontoPct.toFixed(2)} onChange={handleDescontoPctChange} className={cn(INPUT_CLS, 'w-16')} />
      </td>
      <td className="px-2 py-1 text-right">
        <button onClick={handleRemove} className="flex items-center justify-center w-6 h-6 rounded text-status-danger/40 hover:text-status-danger hover:bg-status-danger/10 transition-colors ml-auto">
          <Trash2 size={11} />
        </button>
      </td>
    </tr>
  )
})

interface PedidoTableProps {
  pedido:           Map<string, PedidoItem>
  dfixa:            number
  dvariavel:        number
  varLucro:         number
  onRemove:         (chapaKey: string) => void
  onUpdateQtde:     (chapaKey: string, v: number) => void
  onUpdateDesconto: (chapaKey: string, v: number) => void
  maxHeight?:       number
}

const PedidoTable = memo(function PedidoTable({
  pedido, dfixa, dvariavel, varLucro, onRemove, onUpdateQtde, onUpdateDesconto, maxHeight,
}: PedidoTableProps) {
  const items = useMemo(() => Array.from(pedido.values()), [pedido])

  const { totais, stats } = useMemo(() => {
    const denV = 1 - dfixa - dvariavel - varLucro
    const blocoSet = new Set<number>()
    let totalPc = 0
    const t = items.reduce((acc, item) => {
      blocoSet.add(item.nBloco)
      totalPc += item.pc
      const pCom       = denV !== 0 ? safe(item.custoM2 / denV) : 0
      const valorBruto = pCom * item.qtde
      const valorTotal = valorBruto - item.desconto
      const lucro      = valorTotal - item.custoM2 * item.qtde
      const lucroNet   = varLucro * valorBruto - item.desconto
      return {
        qtde:       acc.qtde       + item.qtde,
        comLucro:   acc.comLucro   + valorTotal,
        lucro:      acc.lucro      + lucro,
        desconto:   acc.desconto   + item.desconto,
        valorBruto: acc.valorBruto + valorBruto,
        lucroNet:   acc.lucroNet   + lucroNet,
      }
    }, { qtde: 0, comLucro: 0, lucro: 0, desconto: 0, valorBruto: 0, lucroNet: 0 })
    const descontoPctTotal = t.valorBruto > 0 ? (t.desconto / t.valorBruto) * 100 : 0
    const lucroFinalPct = t.comLucro > 0 ? (t.lucroNet / t.comLucro) * 100 : 0
    return { totais: { ...t, lucroFinalPct: safe(lucroFinalPct), descontoPctTotal: safe(descontoPctTotal) }, stats: { totalPc, blocos: blocoSet.size } }
  }, [items, dfixa, dvariavel, varLucro])

  const th = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap'
  const ftd = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right font-semibold'
  return (
    <Card noPadding>
      <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2 flex-wrap gap-y-1">
        <ShoppingCart size={12} className="text-[color:var(--color-chart-orange,#f97316)]" />
        <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
          Pedido
        </h2>
        <span className="ml-auto text-[11px] font-semibold text-status-success tabular-nums">
          {fmtBRL(totais.comLucro)}
        </span>
      </div>
      <div
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight: maxHeight ?? 240 }}
      >
        <table className="min-w-max w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface-light">
            <tr className="border-b border-surface-border">
              <th className={cn(th, 'text-left')}>Material</th>
              <th className={cn(th, 'text-right')}>Bloco</th>
              <th className={cn(th, 'text-right')}>Chapa</th>
              <th className={cn(th, 'text-right')}>PC</th>
              <th className={cn(th, 'text-right')}>M² (qtde)</th>
              <th className={cn(th, 'text-right')}>Preço s/ Lucro</th>
              <th className={cn(th, 'text-right')}>Preço c/ Lucro</th>
              <th className={cn(th, 'text-right')}>Lucro</th>
              <th className={cn(th, 'text-right')}>% Lucro</th>
              <th className={cn(th, 'text-right')}>Valor Total</th>
              <th className={cn(th, 'text-right')}>Desc. (R$)</th>
              <th className={cn(th, 'text-right')}>Desc. (%)</th>
              <th className={cn(th, 'text-right')} />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <PedidoRowItem
                key={item.chapaKey}
                item={item}
                dfixa={dfixa}
                dvariavel={dvariavel}
                varLucro={varLucro}
                onRemove={onRemove}
                onUpdateQtde={onUpdateQtde}
                onUpdateDesconto={onUpdateDesconto}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-surface-light border-t-2 border-[var(--line)]">
            <tr>
              <td className="px-2.5 py-1.5 text-[11px] font-semibold text-brand">TOTAL</td>
              <td className={cn(ftd, 'text-[color:var(--color-chart-orange,#f97316)]')}>{stats.blocos}</td>
              <td />
              <td className={cn(ftd, 'text-brand')}>{fmtInt(stats.totalPc)}</td>
              <td className={cn(ftd, 'text-brand')}>{fmtNum(totais.qtde)}</td>
              <td /><td />
              <td className={cn(ftd, totais.lucro >= 0 ? 'text-status-success' : 'text-status-danger')}>{fmtBRL(totais.lucro)}</td>
              <td className={cn(ftd, totais.lucroFinalPct >= 0 ? 'text-status-success' : 'text-status-danger')}>{fmtPct(totais.lucroFinalPct / 100)}</td>
              <td className={cn(ftd, 'text-status-success')}>{fmtBRL(totais.comLucro)}</td>
              <td className={cn(ftd, 'text-text-muted')}>{fmtBRL(totais.desconto)}</td>
              <td className={cn(ftd, 'text-text-muted')}>{fmtPct(totais.descontoPctTotal / 100)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
})

// ─── Simulador de Pedidos (Material > Bloco > Chapa) ─────────────────────────

interface PedidoGroup {
  codMa:    number
  material: string
  blocos:   Map<number, SimuladorChapaRow[]>
}

function buildPedidoGroups(rows: SimuladorChapaRow[]): PedidoGroup[] {
  const map = new Map<number, PedidoGroup>()
  for (const row of rows) {
    if (!map.has(row.codMa)) {
      map.set(row.codMa, { codMa: row.codMa, material: row.material, blocos: new Map() })
    }
    const g = map.get(row.codMa)!
    if (!g.blocos.has(row.nBloco)) g.blocos.set(row.nBloco, [])
    g.blocos.get(row.nBloco)!.push(row)
  }
  return Array.from(map.values())
}

function chapaMatchesSearch(row: SimuladorChapaRow, q: string): boolean {
  if (!q) return true
  const low = q.toLowerCase()
  return (
    row.material.toLowerCase().includes(low) ||
    String(row.nBloco).includes(low) ||
    String(row.chapa).includes(low)
  )
}

const PedidoChapaRow = memo(function PedidoChapaRow({ row, isInPedido, onAdd }: {
  row: SimuladorChapaRow; isInPedido: boolean
  onAdd: (row: SimuladorChapaRow) => void
}) {
  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAdd(row)
  }, [row, onAdd])

  const td  = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right text-text-primary whitespace-nowrap'
  const tdL = 'px-2.5 py-1.5 text-[11px] text-left text-text-primary whitespace-nowrap'
  return (
    <tr className={cn(
      'border-b border-[var(--line)] transition-colors',
      isInPedido
        ? 'bg-[color:var(--color-chart-orange,#f97316)]/[.07]'
        : 'hover:bg-surface-light/30',
    )}>
      <td className={cn(tdL, 'pl-10 text-text-muted')}>
        <div className="flex items-center gap-1">
          <span className="text-text-muted/30 shrink-0 text-[10px]">└─</span>
          <span>Chapa {row.chapa}</span>
          <button
            onClick={handleAdd}
            className={cn(
              'ml-1 shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors',
              isInPedido
                ? 'text-[color:var(--color-chart-orange,#f97316)] opacity-60 cursor-default'
                : 'text-text-muted/40 hover:text-status-success hover:bg-status-success/10',
            )}
            title={isInPedido ? 'Já no pedido' : 'Adicionar ao pedido'}
            disabled={isInPedido}
          >
            {isInPedido ? <span className="text-[9px] font-bold">✓</span> : <Plus size={10} />}
          </button>
        </div>
      </td>
      <td className={cn(td, 'text-text-muted')}>{row.nBloco}</td>
      <td className={cn(td)}>{row.chapa}</td>
      <td className={cn(td)}>{fmtInt(row.pc)}</td>
      <td className={cn(td)}>{fmtNum(row.metrosTotal)}</td>
      <td className={cn(td)}>{fmtBRL(row.custoTotal)}</td>
      <td className={cn(td)}>{fmtBRL(row.custoM2)}</td>
    </tr>
  )
})

interface SimuladorPedidosProps {
  rows:        SimuladorChapaRow[]
  loading:     boolean
  pedidoSet:   Set<string>
  onAddChapa:  (row: SimuladorChapaRow) => void
  maxHeight?:  number
}

const SimuladorPedidos = memo(function SimuladorPedidos({
  rows, loading, pedidoSet, onAddChapa, maxHeight,
}: SimuladorPedidosProps) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const addChapaRef = useRef(onAddChapa)
  addChapaRef.current = onAddChapa
  const handleAddChapa = useCallback((row: SimuladorChapaRow) => {
    addChapaRef.current(row)
  }, [])

  const toggleExpand = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim()
    if (!q) return rows
    return rows.filter(r => chapaMatchesSearch(r, q))
  }, [rows, search])

  const groups = useMemo(() => buildPedidoGroups(filteredRows), [filteredRows])

  const thL = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap text-left'
  const thR = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap text-right'
  const tdL = 'px-2.5 py-1.5 text-[11px] text-left text-text-primary whitespace-nowrap'

  if (loading) {
    return (
      <div className="space-y-1.5 p-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    )
  }

  return (
    <div>
      {/* Search bar */}
      <div className="px-3 py-2 border-b border-surface-border/40">
        <div className="relative max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar material, bloco, chapa..."
            className="w-full bg-surface-light border border-surface-border rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-brand/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted/50 hover:text-text-primary transition-colors text-[10px]"
            >✕</button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Package size={28} className="text-text-muted/40" />
          <p className="text-sm text-text-muted">Nenhuma chapa disponível</p>
        </div>
      ) : (
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: maxHeight ?? 320 }}
        >
          <table className="min-w-max w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface-light">
              <tr className="border-b border-surface-border">
                <th className={thL}>Material / Bloco / Chapa</th>
                <th className={thR}>Nº Bloco</th>
                <th className={thR}>Chapa</th>
                <th className={thR}>PC</th>
                <th className={thR}>M²</th>
                <th className={thR}>Custo Total</th>
                <th className={thR}>Custo M²</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const matKey = `mat-${g.codMa}`
                const isMatExp = expanded.has(matKey)
                const totalChapas = Array.from(g.blocos.values()).reduce((s, arr) => s + arr.length, 0)
                return [
                  // Material row
                  <tr
                    key={matKey}
                    className="border-b border-[var(--line)] cursor-pointer select-none bg-surface-light/20 hover:bg-surface-light/60 transition-colors"
                    onClick={() => toggleExpand(matKey)}
                  >
                    <td className={cn(tdL, 'font-semibold')} colSpan={7}>
                      <div className="flex items-center gap-1.5">
                        {isMatExp ? <ChevronDown size={12} className="text-text-muted" /> : <ChevronRight size={12} className="text-text-muted" />}
                        <span>{g.material}</span>
                        <span className="text-[9px] text-text-muted/60">({totalChapas} {totalChapas === 1 ? 'chapa' : 'chapas'})</span>
                      </div>
                    </td>
                  </tr>,
                  ...(isMatExp ? Array.from(g.blocos.entries()).flatMap(([nBloco, chapas]) => {
                    const blocoKey = `bloco-${g.codMa}-${nBloco}`
                    const isBlocoExp = expanded.has(blocoKey)
                    return [
                      // Bloco row
                      <tr
                        key={blocoKey}
                        className="border-b border-[var(--line)] cursor-pointer select-none hover:bg-surface-light/30 transition-colors"
                        onClick={e => { e.stopPropagation(); toggleExpand(blocoKey) }}
                      >
                        <td className={cn(tdL, 'pl-6 text-text-muted')} colSpan={7}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-text-muted/40 text-[10px]">├</span>
                            {isBlocoExp ? <ChevronDown size={11} className="text-text-muted" /> : <ChevronRight size={11} className="text-text-muted" />}
                            <span className="text-chart-blue font-medium">Bloco {nBloco}</span>
                            <span className="text-[9px] text-text-muted/60">({chapas.length} {chapas.length === 1 ? 'chapa' : 'chapas'})</span>
                          </div>
                        </td>
                      </tr>,
                      // Chapa rows
                      ...(isBlocoExp ? chapas.map(row => (
                        <PedidoChapaRow
                          key={`chapa-${row.nBloco}-${row.chapa}`}
                          row={row}
                          isInPedido={pedidoSet.has(`${row.nBloco}-${row.chapa}`)}
                          onAdd={handleAddChapa}
                        />
                      )) : []),
                    ]
                  }) : []),
                ]
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
})

interface SimFiltrosProps {
  filtros:      SimuladorFiltros
  setFiltros:   (p: Partial<SimuladorFiltros>) => void
  resetFiltros: () => void
  disponiveis?: { materiais: { id: number; label: string }[]; blocos: number[] }
  loading?:     boolean
}

const SimFiltrosInline = memo(function SimFiltrosInline({
  filtros, setFiltros, resetFiltros, disponiveis, loading,
}: SimFiltrosProps) {
  const materiais   = disponiveis?.materiais ?? []
  const blocos      = (disponiveis?.blocos ?? []).map(b => ({ id: b, label: String(b) }))
  const sitSelected = sitToIds(filtros.situacao)
  const activeCount = filtros.materiais.length + filtros.blocos.length + filtros.situacao.length

  return (
    <div className="rounded-xl bg-surface border border-surface-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-text-muted shrink-0">
          <SlidersHorizontal size={14} />
          <span className="text-[11px] font-medium uppercase tracking-wider">Filtros</span>
          {activeCount > 0 && (
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
            triggerClassName={TRIG}
          />
          <MultiSelect
            label="Nº Bloco"
            options={blocos}
            selected={filtros.blocos}
            onChange={ids => setFiltros({ blocos: ids })}
            placeholder="Todos"
            loading={loading}
            triggerClassName={TRIG}
          />
          <MultiSelect
            label="Situação"
            options={SITUACAO_OPTIONS}
            selected={sitSelected}
            onChange={ids => setFiltros({ situacao: idsToSit(ids) })}
            placeholder="Todas"
            triggerClassName={TRIG}
          />
        </div>
        {activeCount > 0 && (
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

interface SimMobileDrawerProps {
  open:         boolean
  onClose:      () => void
  filtros:      SimuladorFiltros
  setFiltros:   (p: Partial<SimuladorFiltros>) => void
  resetFiltros: () => void
  disponiveis?: { materiais: { id: number; label: string }[]; blocos: number[] }
  loading?:     boolean
}

const SimMobileDrawer = memo(function SimMobileDrawer({
  open, onClose, filtros, setFiltros, resetFiltros, disponiveis, loading,
}: SimMobileDrawerProps) {
  const materiais   = disponiveis?.materiais ?? []
  const blocos      = (disponiveis?.blocos ?? []).map(b => ({ id: b, label: String(b) }))
  const sitSelected = sitToIds(filtros.situacao)
  const activeCount = filtros.materiais.length + filtros.blocos.length + filtros.situacao.length

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'sm:hidden fixed top-0 right-0 h-full z-50 w-[85vw] max-w-[320px]',
          'bg-surface border-l border-surface-border shadow-2xl',
          'overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <SlidersHorizontal size={14} />
            <span className="text-[12px] uppercase tracking-widest font-semibold">Filtros</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand/20 text-brand text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          <MultiSelect label="Material"  options={materiais}        selected={filtros.materiais}  onChange={ids => setFiltros({ materiais: ids })}                       loading={loading} />
          <MultiSelect label="Nº Bloco"  options={blocos}           selected={filtros.blocos}     onChange={ids => setFiltros({ blocos: ids })}                          loading={loading} />
          <MultiSelect label="Situação"  options={SITUACAO_OPTIONS} selected={sitSelected}         onChange={ids => setFiltros({ situacao: idsToSit(ids) })} />
          <div className="h-24" />
        </div>

        <div className="sticky bottom-0 z-10 px-4 py-4 bg-surface border-t border-surface-border flex flex-col gap-2">
          {activeCount > 0 && (
            <button
              onClick={() => { resetFiltros(); onClose() }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-status-danger bg-status-danger/10 border border-status-danger/20 hover:bg-status-danger/20 transition-all"
            >
              <RefreshCw size={12} /> Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-text-secondary bg-surface-light border border-surface-border hover:bg-surface-border transition-all"
          >
            Aplicar e fechar
          </button>
        </div>
      </div>
    </>
  )
})

export function SimuladorPage() {
  const { filtros, setFiltros, resetFiltros } = useSimuladorStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: filtrosDisp, isLoading: filtrosLoading } = useSimuladorFiltrosDisponiveis()
  const { matriz, chapas, vendas, resumo } = useSimuladorAll()
  const { data: matrizData, isLoading: matrizLoading } = matriz
  const { data: chapasData, isLoading: chapasLoading } = chapas
  const { data: vendasData, isLoading: vendasLoading } = vendas
  const { data: resumoData, isLoading: resumoLoading } = resumo

  const [varLucro, setVarLucro] = useState(DEFAULT_VAR_LUCRO)
  const didInitLucro = useRef(false)
  const [pedidoLucro, setPedidoLucro] = useState(DEFAULT_VAR_LUCRO)
  const didInitPedidoLucro = useRef(false)
  const [dVariavel, setDVariavel] = useState(0)
  const [dFixa, setDFixa]         = useState(0)
  const didInitIndicadores = useRef(false)
  const [pedidoDVariavel, setPedidoDVariavel] = useState(0)
  const [pedidoDFixa,     setPedidoDFixa]     = useState(0)
  const didInitPedidoParams = useRef(false)
  const [, startTransition] = useTransition()

  // ── pedido state — totalmente isolado de filtros e queries ──────────────────
  const [pedido, setPedido] = useState<Map<string, PedidoItem>>(new Map())

  const pedidoSet = useMemo(() => new Set(pedido.keys()), [pedido])

  const addToPedido = useCallback((row: SimuladorChapaRow) => {
    const chapaKey = `${row.nBloco}-${row.chapa}`
    setPedido(prev => {
      if (prev.has(chapaKey)) return prev
      const next = new Map(prev)
      next.set(chapaKey, {
        chapaKey,
        nBloco:      row.nBloco,
        chapa:       row.chapa,
        codMa:       row.codMa,
        material:    row.material,
        pc:          row.pc,
        metrosTotal: row.metrosTotal,
        custoTotal:  row.custoTotal,
        custoM2:     row.custoM2,
        qtde:        row.metrosTotal,
        desconto:    0,
      })
      return next
    })
  }, [])

  const removeFromPedido = useCallback((chapaKey: string) => {
    setPedido(prev => {
      if (!prev.has(chapaKey)) return prev
      const next = new Map(prev)
      next.delete(chapaKey)
      return next
    })
  }, [])

  const updatePedidoQtde = useCallback((chapaKey: string, qtde: number) => {
    setPedido(prev => {
      const item = prev.get(chapaKey)
      if (!item || item.qtde === qtde) return prev
      const next = new Map(prev)
      next.set(chapaKey, { ...item, qtde: Math.max(0, qtde) })
      return next
    })
  }, [])

  const updatePedidoDesconto = useCallback((chapaKey: string, desconto: number) => {
    setPedido(prev => {
      const item = prev.get(chapaKey)
      if (!item || item.desconto === desconto) return prev
      const next = new Map(prev)
      next.set(chapaKey, { ...item, desconto: Math.max(0, desconto) })
      return next
    })
  }, [])

  useEffect(() => {
    if (!didInitLucro.current && resumoData && resumoData.maxLucro > 0) {
      setVarLucro(resumoData.maxLucro)
      didInitLucro.current = true
      if (!didInitPedidoLucro.current) {
        setPedidoLucro(resumoData.maxLucro)
        didInitPedidoLucro.current = true
      }
      if (!didInitIndicadores.current) {
        setDVariavel(resumoData.maxDvariavel)
        setDFixa(resumoData.maxDfixa)
        didInitIndicadores.current = true
      }
      if (!didInitPedidoParams.current) {
        setPedidoDVariavel(resumoData.maxDvariavel)
        setPedidoDFixa(resumoData.maxDfixa)
        didInitPedidoParams.current = true
      }
    }
  }, [resumoData])

  const matrizRows = useMemo(() => matrizData?.rows ?? [], [matrizData?.rows])
  const chapasRows = useMemo(() => chapasData?.rows ?? [], [chapasData?.rows])
  const vendasRows = useMemo(() => vendasData?.rows ?? [], [vendasData?.rows])

  const pedidoCalcs = useMemo(() => {
    const items = Array.from(pedido.values())
    if (items.length === 0) return null

    const denV = 1 - pedidoDFixa - pedidoDVariavel - pedidoLucro
    const desp = 1 - pedidoDVariavel - pedidoDFixa

    return items.reduce((acc, item) => {
      const precoComLucroM2 = denV !== 0 ? safe(item.custoM2 / denV) : 0
      const valorBruto      = precoComLucroM2 * item.qtde
      const valorTotal      = valorBruto - item.desconto
      const custoQtde       = item.custoM2 * item.qtde
      const lucro           = valorTotal - custoQtde
      const despesas        = valorTotal * desp
      const lucroLiquido    = despesas - lucro

      return {
        totalCusto:      acc.totalCusto      + custoQtde,
        totalValor:      acc.totalValor      + valorTotal,
        totalLucro:      acc.totalLucro      + lucroLiquido,
        totalM2:         acc.totalM2         + item.qtde,
        totalPc:         acc.totalPc         + item.pc,
        totalDesconto:   acc.totalDesconto   + item.desconto,
      }
    }, { totalCusto: 0, totalValor: 0, totalLucro: 0, totalM2: 0, totalPc: 0, totalDesconto: 0 })
  }, [pedido, pedidoDFixa, pedidoDVariavel, pedidoLucro])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSetFiltrosDebounced = useCallback((partial: Partial<SimuladorFiltros>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(() => { setFiltros(partial) })
    }, 200)
  }, [setFiltros])

  const calcs = useMemo<SimuladorCalcs | null>(() => {
    if (!resumoData) return null
    return calcSimulador(resumoData, varLucro, dVariavel, dFixa)
  }, [resumoData, varLucro, dVariavel, dFixa])

  const r = resumoData
  const activeCount = filtros.materiais.length + filtros.blocos.length + filtros.situacao.length

  const faturamentoVariavel = useMemo(() => {
    if(!calcs || calcs.precoVendaVar === 'S/ESTOQUE') return null
  
    const preco = calcs.precoVendaVar
  
    const totalM2Disponivel = matrizRows.reduce(
      (sum, row) => sum + Math.max(0, row.metrosTotal - row.vendidas),0
    )
  
    return totalM2Disponivel * preco
  }, [matrizRows, calcs])

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">

      {/* Filtros desktop */}
      <div className="hidden sm:block">
        <SimFiltrosInline
          filtros={filtros}
          setFiltros={handleSetFiltrosDebounced}
          resetFiltros={resetFiltros}
          disponiveis={filtrosDisp}
          loading={filtrosLoading}
        />
      </div>

       {/* BLOCO 1 — Materiais */}
      <ErrorBoundary>
        <Card noPadding>
          <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2">
            <Package size={12} className="text-brand" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
              Materiais
            </h2>
          </div>
          <MatrizMateriais
            rows={matrizRows}
            loading={matrizLoading}
            filtrosMateriais={filtros.materiais}
            filtrosBlocos={filtros.blocos}
            setFiltros={handleSetFiltrosDebounced}
            maxHeight={280}
          />
        </Card>
      </ErrorBoundary>

      {/* BLOCO 2 — Total Realizado */}
      <ErrorBoundary>
        <Card noPadding>
          <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2">
            <TrendingUp size={12} className="text-brand" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
              Total Realizado (Vendas Realizadas)
            </h2>
          </div>
          <VendasTable
            rows={vendasRows}
            loading={vendasLoading}
            maxHeight={240}
          />
        </Card>
      </ErrorBoundary>

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



        {/* BLOCO 5 */}
        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                Simulador de Valores
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2 items-stretch">

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
              <InfoCard
                title="Faturamento Potencial (Variável)"
                value={faturamentoVariavel === null
                  ? 'S/ESTOQUE'
                  : fmtBRL(faturamentoVariavel)
                }
                icon={TrendingUp}
                accent={faturamentoVariavel !== null && faturamentoVariavel > 0
                  ? 'text-status-success'
                  : 'text-text-muted'
                }
                loading={resumoLoading || matrizLoading}
                highlight={faturamentoVariavel !== null && faturamentoVariavel > 0}
              />
                <InfoCard
                title="Lucro (Variável)"
                value={calcs === null ? '—' : fmtBRL(calcs.lucroVariavel)}
                icon={TrendingUp}
                accent={calcs && calcs.lucroVariavel >= 0 ? 'text-status-success' : 'text-status-danger'}
                loading={resumoLoading}
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
            <div className="grid grid-cols-3 gap-2 items-stretch">
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
              <LucroSlider
                value={varLucro}
                onChange={setVarLucro}
                disabled={resumoLoading}
              />
              <LucroSlider
                label="% D. VARIÁVEL"
                value={dVariavel}
                onChange={setDVariavel}
                disabled={resumoLoading}
              />
              <LucroSlider
                label="% D. FIXA"
                value={dFixa}
                onChange={setDFixa}
                disabled={resumoLoading}
              />
            </div>
          </Card>
        </ErrorBoundary>

      </div>

      <div className="w-full h-px bg-[var(--line)] my-1" />

     



      {/* SIMULADOR DE PEDIDOS */}
      <ErrorBoundary>
        <Card noPadding>
          <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2">
            <ShoppingCart size={12} className="text-[color:var(--color-chart-orange,#f97316)]" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
              Simulador de Pedidos
            </h2>
          </div>
          <SimuladorPedidos
            rows={chapasRows}
            loading={chapasLoading}
            pedidoSet={pedidoSet}
            onAddChapa={addToPedido}
            maxHeight={320}
          />
        </Card>
      </ErrorBoundary>

      {/* PEDIDO */}
      {pedido.size > 0 && (
        <ErrorBoundary>
          <PedidoTable
            pedido={pedido}
            dfixa={pedidoDFixa}
            dvariavel={pedidoDVariavel}
            varLucro={pedidoLucro}
            onRemove={removeFromPedido}
            onUpdateQtde={updatePedidoQtde}
            onUpdateDesconto={updatePedidoDesconto}
            maxHeight={240}
          />
        </ErrorBoundary>
      )}

      {/* PARÂMETROS DO SIMULADOR DE PEDIDOS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {/*PARÂMETROS - BLOCO 1*/}
        <ErrorBoundary>
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Settings size={12} className="text-brand" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
              Parâmetros do Simulador de Pedidos
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <LucroSlider label="% DE LUCRO"    value={pedidoLucro}     onChange={setPedidoLucro} />
            <LucroSlider label="% D. VARIÁVEL" value={pedidoDVariavel} onChange={setPedidoDVariavel} />
            <LucroSlider label="% D. FIXA"     value={pedidoDFixa}     onChange={setPedidoDFixa} />
          </div>
        </Card>
         </ErrorBoundary>

        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                Simulador de Valores
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <InfoCard
                title="Valor Total - Pedido"
                value={pedidoCalcs === null ? '—' : fmtBRL(pedidoCalcs.totalValor)}
                icon={DollarSign}
                accent="text-brand"
                loading={resumoLoading}
                highlight
              />
              <InfoCard
                title="Custo Total do Pedido"
                value={pedidoCalcs === null ? '—' : fmtBRL(pedidoCalcs.totalCusto)}
                icon={BarChart2}
                accent="text-chart-teal"
                loading={resumoLoading}
              />
              <InfoCard
                title="Lucro"
                value={pedidoCalcs === null ? '—' : fmtBRL(pedidoCalcs.totalLucro)}
                icon={TrendingUp}
                accent={pedidoCalcs && pedidoCalcs.pdrLucro >= 0 ? 'text-status-success' : 'text-status-danger'}
                loading={resumoLoading}
              />
            </div>
          </Card>
        </ErrorBoundary>

        
      </div>

      {/* Drawer mobile */}
      <SimMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filtros={filtros}
        setFiltros={handleSetFiltrosDebounced}
        resetFiltros={resetFiltros}
        disponiveis={filtrosDisp}
        loading={filtrosLoading}
      />

      {/* FAB mobile */}
      <button
        onClick={() => setDrawerOpen(v => !v)}
        className={cn(
          'sm:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl',
          'flex items-center justify-center transition-all duration-200 active:scale-95',
          activeCount > 0
            ? 'bg-brand shadow-brand/30 text-surface-dark'
            : 'bg-surface border border-surface-border/80 text-text-muted hover:border-brand/40 hover:text-brand',
        )}
        aria-label="Abrir filtros"
      >
        <Filter size={22} />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-status-danger text-white text-[10px] font-bold flex items-center justify-center shadow">
            {activeCount > 9 ? '9+' : activeCount}
          </span>
        )}
      </button>
    </div>
  )
}
