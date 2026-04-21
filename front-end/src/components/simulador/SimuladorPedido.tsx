import { memo, useMemo, useState, useCallback, useRef } from 'react'
import {
  Package, ChevronDown, ChevronRight, Plus, Trash2, ShoppingCart, Search,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, fmtBRL, fmtNum, fmtInt, fmtPct } from '@/lib/utils'
import type { SimuladorChapaRow } from '@/types'
import { type PedidoItem, calcPedidoItem } from './simulador-calcs'

export type { PedidoItem }

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

export interface PedidoTableProps {
  pedido:           Map<string, PedidoItem>
  dfixa:            number
  dvariavel:        number
  varLucro:         number
  onRemove:         (chapaKey: string) => void
  onUpdateQtde:     (chapaKey: string, v: number) => void
  onUpdateDesconto: (chapaKey: string, v: number) => void
  maxHeight?:       number
}

const safe = (n: number) => (!isFinite(n) || isNaN(n)) ? 0 : n

export const PedidoTable = memo(function PedidoTable({
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
    const lucroFinalPct    = t.comLucro > 0 ? (t.lucroNet / t.comLucro) * 100 : 0
    return {
      totais: { ...t, lucroFinalPct: safe(lucroFinalPct), descontoPctTotal: safe(descontoPctTotal) },
      stats: { totalPc, blocos: blocoSet.size },
    }
  }, [items, dfixa, dvariavel, varLucro])

  const th  = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap'
  const ftd = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right font-semibold'
  return (
    <Card noPadding>
      <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2 flex-wrap gap-y-1">
        <ShoppingCart size={12} className="text-[color:var(--color-chart-orange,#f97316)]" />
        <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Pedido</h2>
        <span className="ml-auto text-[11px] font-semibold text-status-success tabular-nums">
          {fmtBRL(totais.comLucro)}
        </span>
      </div>
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: maxHeight ?? 240 }}>
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

export interface SimuladorPedidosProps {
  rows:       SimuladorChapaRow[]
  loading:    boolean
  pedidoSet:  Set<string>
  onAddChapa: (row: SimuladorChapaRow) => void
  maxHeight?: number
}

export const SimuladorPedidos = memo(function SimuladorPedidos({
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
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: maxHeight ?? 320 }}>
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
                const matKey   = `mat-${g.codMa}`
                const isMatExp = expanded.has(matKey)
                const totalChapas = Array.from(g.blocos.values()).reduce((s, arr) => s + arr.length, 0)
                return [
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
                    const blocoKey  = `bloco-${g.codMa}-${nBloco}`
                    const isBlocoExp = expanded.has(blocoKey)
                    return [
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
