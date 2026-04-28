import { memo } from 'react'
import { Card } from '@/components/ui/Card'
import { SkeletonChart } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSaldoBancario } from '@/hooks/useFinanceiroData'
import { cn } from '@/lib/utils'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })

function ValorCell({ v }: { v: number }) {
  return (
    <span className={cn('tabular-nums', v < 0 ? 'text-status-danger' : '')}>
      {fmtBRL(v)}
    </span>
  )
}

export const SaldoBancarioTable = memo(function SaldoBancarioTable() {
  const { data, isLoading, isError, refetch } = useSaldoBancario()

  if (isLoading) return <SkeletonChart />
  if (isError)   return <Card><ErrorState onRetry={refetch} /></Card>

  const rows = data ?? []
  if (rows.length === 0) return <Card><EmptyState /></Card>

  const totIni = rows.reduce((s, r) => s + r.saldoInicial, 0)
  const totFin = rows.reduce((s, r) => s + r.saldoFinal,   0)

  return (
    <Card noPadding className="flex flex-col overflow-hidden">
      <div className="px-4 pt-3 pb-1 shrink-0">
        <h3 className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
          Saldo Bancário
        </h3>
      </div>

      <div className="max-h-[320px] overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 bg-surface-light">
            <tr>
              <th className="text-left px-3 py-2 text-text-muted font-medium">Conta</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium whitespace-nowrap">Saldo Inicial</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium whitespace-nowrap">Saldo Final</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.codConta} className="border-t border-surface-border hover:bg-surface-light/40 transition-colors">
                <td className="px-3 py-1.5 text-text-primary truncate max-w-[140px]">{r.nomeConta}</td>
                <td className="px-3 py-1.5 text-right"><ValorCell v={r.saldoInicial} /></td>
                <td className="px-3 py-1.5 text-right"><ValorCell v={r.saldoFinal} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-surface border-t-2 border-surface-border">
            <tr>
              <td className="px-3 py-2 text-text-primary font-bold">Total</td>
              <td className="px-3 py-2 text-right font-bold"><ValorCell v={totIni} /></td>
              <td className="px-3 py-2 text-right font-bold"><ValorCell v={totFin} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
})
