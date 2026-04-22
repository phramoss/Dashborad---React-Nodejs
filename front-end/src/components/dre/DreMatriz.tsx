import { memo, useState, useCallback } from 'react'
import { BarChart2, ChevronRight, ChevronDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { useLazyRows } from '@/hooks/useLazyRows'
import type { DreLinha, DreContaRow, DreClienteRow } from '@/types'
import { fmtBRL, fmtPct, safe, periodoLabel, rowStyle, TD_BASE, TD_LEFT, MIN_LABEL_W, MIN_COL_W, MIN_TOT_W } from './dre-helpers'

const DreClientRow = memo(function DreClientRow({
  row, periodos,
}: { row: DreClienteRow; periodos: number[] }) {
  return (
    <tr className="border-b border-surface-border/10 hover:bg-surface-light/10 transition-colors">
      <td
        className={cn(TD_LEFT, 'pl-16 sticky left-0 bg-surface text-text-muted/60 text-[10px] z-[3]')}
        style={{ minWidth: MIN_LABEL_W }}
      >
        <div className="flex items-center gap-1">
          <span className="text-text-muted/20 text-[9px] shrink-0">└─</span>
          <span className="truncate max-w-[160px]">{row.cliente}</span>
        </div>
      </td>
      {row.valores.map((v, i) => (
        <td key={periodos[i]} className={cn(TD_BASE, 'text-text-muted/70 text-[10px]')} style={{ minWidth: MIN_COL_W }}>
          {v !== 0 ? fmtBRL(v) : '—'}
        </td>
      ))}
      <td className={cn(TD_BASE, 'text-text-muted/70 text-[10px] font-medium')} style={{ minWidth: MIN_TOT_W }}>
        {fmtBRL(row.total)}
      </td>
    </tr>
  )
})

interface ContaRowProps {
  row:        DreContaRow
  codLinha:   number
  periodos:   number[]
  isExpanded: boolean
  onToggle:   (key: string) => void
}

const DreContaRowComp = memo(function DreContaRowComp({
  row, codLinha, periodos, isExpanded, onToggle,
}: ContaRowProps) {
  const key = `${codLinha}-${row.contab}`
  return (
    <>
      <tr
        className="border-b border-surface-border/15 cursor-pointer hover:bg-surface-light/20 transition-colors select-none"
        onClick={() => onToggle(key)}
      >
        <td
          className={cn(TD_LEFT, 'pl-10 sticky left-0 bg-surface z-[3]')}
          style={{ minWidth: MIN_LABEL_W }}
        >
          <div className="flex items-center gap-1.5">
            <button className="shrink-0 text-text-muted/40 hover:text-text-muted transition-colors">
              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
            <span className="text-text-muted/30 text-[9px] shrink-0">└</span>
            <span className="text-text-muted text-[10px] truncate max-w-[160px]">{row.descricao}</span>
            <span className="text-[8px] text-text-muted/40 shrink-0 font-mono">{row.contab}</span>
          </div>
        </td>
        {row.valores.map((v, i) => (
          <td key={periodos[i]} className={cn(TD_BASE, 'text-text-muted text-[10px]')} style={{ minWidth: MIN_COL_W }}>
            {v !== 0 ? fmtBRL(v) : '—'}
          </td>
        ))}
        <td className={cn(TD_BASE, 'text-text-muted text-[10px] font-medium')} style={{ minWidth: MIN_TOT_W }}>
          {fmtBRL(row.total)}
        </td>
      </tr>
      {isExpanded && row.clientes.map((cli) => (
        <DreClientRow key={cli.cliente} row={cli} periodos={periodos} />
      ))}
    </>
  )
})

interface LinhaRowProps {
  linha:          DreLinha
  periodos:       number[]
  isExpanded:     boolean
  expandedContas: Set<string>
  onToggleLinha:  (cod: number) => void
  onToggleConta:  (key: string) => void
}

const DreLinhRow = memo(function DreLinhRow({
  linha, periodos, isExpanded, expandedContas, onToggleLinha, onToggleConta,
}: LinhaRowProps) {
  const { total, tipo, contas, prefixo, descricao, ehPercentual, cod } = linha
  const style = rowStyle(linha, total)
  const hasContas = contas.length > 0
  const isSeparator = tipo !== 'A'
  const isHighlighted = cod === 4 || cod === 6 || cod === 11 || cod === 14

  return (
    <>
      <tr
        className={cn(
          'border-b border-surface-border/30 select-none transition-colors',
          hasContas && 'cursor-pointer hover:bg-surface-light/30',
          style.row,
          isSeparator && 'border-t border-surface-border/60',
        )}
        onClick={() => hasContas && onToggleLinha(cod)}
      >
        <td
          className={cn(
            TD_LEFT,
            'sticky left-0 z-[3] font-medium',
            style.row || 'bg-surface',
            isHighlighted ? 'bg-inherit' : '',
          )}
          style={{ minWidth: MIN_LABEL_W }}
        >
          <div className="flex items-center gap-1.5">
            {hasContas ? (
              <button className="shrink-0 text-text-muted/50 hover:text-text-muted transition-colors">
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            ) : (
              <span className="w-[19px] shrink-0" />
            )}
            <span className={cn(
              'text-[10px] font-mono shrink-0',
              tipo === 'A'  ? 'text-text-muted/60' :
              tipo === 'ST' || tipo === 'DT' ? (total >= 0 ? 'text-status-success/70' : 'text-status-danger/70') :
              'text-chart-purple/60',
            )}>
              {prefixo}
            </span>
            <span className={cn(
              'text-[11px]',
              tipo === 'A'  ? 'text-text-primary' :
              tipo === 'ST' || tipo === 'DT' ? (total >= 0 ? 'text-status-success' : 'text-status-danger') :
              'text-chart-purple',
              isHighlighted && 'font-semibold',
            )}>
              {descricao}
            </span>
          </div>
        </td>
        {linha.valores.map((v, i) => (
          <td
            key={periodos[i]}
            className={cn(TD_BASE, style.val, 'text-[11px]')}
            style={{ minWidth: MIN_COL_W }}
          >
            {ehPercentual ? fmtPct(safe(v)) : (v !== 0 ? fmtBRL(v) : '—')}
          </td>
        ))}
        <td
          className={cn(TD_BASE, style.val, 'text-[11px] border-l border-surface-border/30')}
          style={{ minWidth: MIN_TOT_W }}
        >
          {ehPercentual ? fmtPct(safe(total)) : fmtBRL(safe(total))}
        </td>
      </tr>
      {isExpanded && contas.map((conta) => (
        <DreContaRowComp
          key={`${cod}-${conta.contab}`}
          row={conta}
          codLinha={cod}
          periodos={periodos}
          isExpanded={expandedContas.has(`${cod}-${conta.contab}`)}
          onToggle={onToggleConta}
        />
      ))}
    </>
  )
})

export interface DreMatrizProps {
  linhas:   DreLinha[]
  periodos: number[]
  loading:  boolean
}

export const DreMatriz = memo(function DreMatriz({ linhas, periodos, loading }: DreMatrizProps) {
  const [expandedLinhas, setExpandedLinhas] = useState<Set<number>>(new Set())
  const [expandedContas, setExpandedContas] = useState<Set<string>>(new Set())
  const { visible: visibleLinhas, hasMore: hasMoreLinhas, sentinelRef: linhaSentinelRef } = useLazyRows(linhas)

  const toggleLinha = useCallback((cod: number) => {
    setExpandedLinhas(prev => {
      const next = new Set(prev)
      next.has(cod) ? next.delete(cod) : next.add(cod)
      return next
    })
  }, [])

  const toggleConta = useCallback((key: string) => {
    setExpandedContas(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-1 p-3">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    )
  }

  if (periodos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <BarChart2 size={28} className="text-text-muted/30" />
        <p className="text-sm text-text-muted">Nenhum dado encontrado</p>
        <p className="text-xs text-text-muted/60">Ajuste o período ou verifique os dados</p>
      </div>
    )
  }

  const thBase = 'px-2.5 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap text-right'

  return (
    <div className="overflow-x-auto">
      <table className="min-w-max w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface-light">
          <tr className="border-b border-surface-border">
            <th
              className={cn(thBase, 'text-left sticky left-0 z-20 bg-surface-light')}
              style={{ minWidth: MIN_LABEL_W }}
            >
              DRE
            </th>
            {periodos.map(p => (
              <th key={p} className={thBase} style={{ minWidth: MIN_COL_W }}>
                {periodoLabel(p)}
              </th>
            ))}
            <th
              className={cn(thBase, 'border-l border-surface-border/30 text-brand')}
              style={{ minWidth: MIN_TOT_W }}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleLinhas.map(linha => (
            <DreLinhRow
              key={linha.cod}
              linha={linha}
              periodos={periodos}
              isExpanded={expandedLinhas.has(linha.cod)}
              expandedContas={expandedContas}
              onToggleLinha={toggleLinha}
              onToggleConta={toggleConta}
            />
          ))}
          {hasMoreLinhas && (
            <tr>
              <td colSpan={999}>
                <div ref={linhaSentinelRef} className="h-8 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-brand/40 border-t-brand animate-spin" />
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
})
