import { memo } from 'react'
import { useFiltrosStore } from '@/store/filtros.store'
import { cn } from '@/lib/utils'

const MESES = [
  { num: 1,  label: 'Jan' },
  { num: 2,  label: 'Fev' },
  { num: 3,  label: 'Mar' },
  { num: 4,  label: 'Abr' },
  { num: 5,  label: 'Mai' },
  { num: 6,  label: 'Jun' },
  { num: 7,  label: 'Jul' },
  { num: 8,  label: 'Ago' },
  { num: 9,  label: 'Set' },
  { num: 10, label: 'Out' },
  { num: 11, label: 'Nov' },
  { num: 12, label: 'Dez' },
]

interface FiltroMesesProps {
  /** Se true, renderiza todos os 12 botões num grid 4×3 (modo painel mobile).
   *  Se false (padrão), renderiza a linha compacta horizontal do desktop. */
  grid?: boolean
}

export const FiltroMeses = memo(function FiltroMeses({ grid = false }: FiltroMesesProps) {
  const { filtros, toggleMes } = useFiltrosStore()
  const selected = filtros.meses

  if (grid) {
    return (
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2">Mês</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MESES.map(({ num, label }) => {
            const isActive = selected.includes(num)
            return (
              <button
                key={num}
                onClick={() => toggleMes(num)}
                className={cn(
                  'py-1.5 rounded-md text-[11px] font-medium transition-all duration-150 text-center',
                  isActive
                    ? 'bg-brand text-surface-dark shadow-glow'
                    : 'bg-surface-light text-text-secondary hover:text-text-primary hover:bg-surface-border',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Modo desktop: linha compacta
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] sm:text-[11.5px] text-text-muted uppercase tracking-widest mr-1">
        Mês
      </span>
      {MESES.map(({ num, label }) => {
        const isActive = selected.includes(num)
        return (
          <button
            key={num}
            onClick={() => toggleMes(num)}
            className={cn(
              'px-2 py-1 rounded-md text-[10px] sm:text-[12px] font-medium transition-all duration-150',
              isActive
                ? 'bg-brand text-surface-dark shadow-glow'
                : 'bg-surface-light text-text-secondary hover:text-text-primary hover:bg-surface-border',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
})
