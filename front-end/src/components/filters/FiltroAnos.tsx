import { memo } from 'react'
import { useFiltrosStore } from '@/store/filtros.store'
import { useFiltrosDisponiveis } from '@/hooks/useFiltrosDisponiveis'
import { cn } from '@/lib/utils'

export const FiltroAnos = memo(function FiltroAnos() {
  const { filtros, toggleAno } = useFiltrosStore()
  const { data: opts, isLoading } = useFiltrosDisponiveis()
  const { anos: selected } = filtros

  // Usa anos da API; fallback estático enquanto carrega
  const anosDisponiveis = opts?.anos ?? []

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] sm:text-[11.5px] text-text-muted uppercase tracking-widest mr-1">Ano</span>
        {[2021, 2022, 2023, 2024].map(a => (
          <div key={a} className="w-10 h-6 rounded-md bg-surface-light animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] sm:text-[11.5px] text-text-muted uppercase tracking-widest mr-1">Ano</span>
      {anosDisponiveis.map((ano) => {
        const isActive = selected.includes(ano)
        return (
          <button
            key={ano}
            onClick={() => toggleAno(ano)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[10px] sm:text-[13.5px] font-medium transition-all duration-150',
              isActive
                ? 'bg-brand text-surface-dark shadow-glow'
                : 'bg-surface-light text-text-secondary hover:text-text-primary hover:bg-surface-border',
            )}
          >
            {ano}
          </button>
        )
      })}
    </div>
  )
})
