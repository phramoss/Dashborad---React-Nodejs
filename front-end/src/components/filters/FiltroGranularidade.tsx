import { memo } from 'react'
import { useFiltrosStore } from '@/store/filtros.store'
import { cn } from '@/lib/utils'
import type { GranularidadePeriodo } from '@/types'

const OPTIONS: { value: GranularidadePeriodo; label: string }[] = [
  { value: 'ano', label: 'Ano' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'mes', label: 'Mês' },
]

export const FiltroGranularidade = memo(function FiltroGranularidade() {
  const { filtros, setGranularidade } = useFiltrosStore()

  return (
    <div className="flex items-center gap-1 bg-surface-light rounded-lg p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setGranularidade(opt.value)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
            filtros.granularidade === opt.value
              ? 'bg-surface text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
})
