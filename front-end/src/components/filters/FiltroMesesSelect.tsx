/**
 * FiltroMesesSelect.tsx
 *
 * Dropdown de Mês no padrão visual do MultiSelect.
 * Usa position:fixed calculado via getBoundingClientRect para funcionar
 * corretamente dentro do drawer mobile (overflow:auto) sem ser cortado.
 */
import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { useFiltrosStore } from '@/store/filtros.store'
import { cn } from '@/lib/utils'

const MESES = [
  { num: 1,  label: 'Janeiro',   abrev: 'Jan' },
  { num: 2,  label: 'Fevereiro', abrev: 'Fev' },
  { num: 3,  label: 'Março',     abrev: 'Mar' },
  { num: 4,  label: 'Abril',     abrev: 'Abr' },
  { num: 5,  label: 'Maio',      abrev: 'Mai' },
  { num: 6,  label: 'Junho',     abrev: 'Jun' },
  { num: 7,  label: 'Julho',     abrev: 'Jul' },
  { num: 8,  label: 'Agosto',    abrev: 'Ago' },
  { num: 9,  label: 'Setembro',  abrev: 'Set' },
  { num: 10, label: 'Outubro',   abrev: 'Out' },
  { num: 11, label: 'Novembro',  abrev: 'Nov' },
  { num: 12, label: 'Dezembro',  abrev: 'Dez' },
]

export const FiltroMesesSelect = memo(function FiltroMesesSelect() {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { filtros, toggleMes, resetFiltro } = useFiltrosStore()
  const selected = filtros.meses

  // Calcula posição fixed ao abrir
  function openDropdown() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 192) })
    setOpen(true)
  }

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      const drop = document.getElementById('meses-dropdown')
      if (drop?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  // Fecha ao Escape; reposiciona ao scroll
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 192) })
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const clear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    resetFiltro('meses')
  }, [resetFiltro])

  const hasSelection = selected.length > 0

  const triggerLabel = () => {
    if (!hasSelection) return 'Todos'
    if (selected.length === 1)
      return MESES.find(m => m.num === selected[0])?.abrev ?? String(selected[0])
    if (selected.length <= 3)
      return selected.sort((a, b) => a - b)
        .map(n => MESES.find(m => m.num === n)?.abrev ?? String(n))
        .join(', ')
    return `${selected.length} meses`
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : openDropdown()}
        className={cn(
          'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs w-full',
          'border transition-all duration-150',
          open || hasSelection
            ? 'border-brand/50 bg-[var(--surface)] text-text-primary'
            : 'border-[var(--border)] bg-[var(--surface)] text-text-secondary hover:text-text-primary',
        )}
      >
        <span className="text-text-muted text-[11.5px] uppercase tracking-wider shrink-0">Mês</span>
        <span className={cn('flex-1 text-left truncate text-[13.5px]', hasSelection && 'text-brand font-medium')}>
          {triggerLabel()}
        </span>
        {hasSelection ? (
          <X size={11} className="text-text-muted hover:text-status-danger shrink-0" onClick={clear} />
        ) : (
          <ChevronDown size={11} className={cn('text-text-muted shrink-0 transition-transform', open && 'rotate-180')} />
        )}
      </button>

      {/* Dropdown — position:fixed para não ser cortado por overflow */}
      {open && dropPos && (
        <div
          id="meses-dropdown"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-card flex flex-col overflow-hidden"
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {MESES.map(({ num, label }) => {
              const isSelected = selected.includes(num)
              return (
                <button
                  key={num}
                  onClick={() => toggleMes(num)}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2 text-[13.5px] text-left',
                    'hover:bg-surface-light transition-colors',
                    isSelected && 'text-brand',
                  )}
                >
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all',
                    isSelected ? 'bg-brand border-brand' : 'border-surface-border',
                  )}>
                    {isSelected && <Check size={9} className="text-surface-dark" strokeWidth={3} />}
                  </div>
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
          {hasSelection && (
            <div className="border-t border-[var(--border)] px-3 py-2 flex items-center justify-between">
              <span className="text-[11.5px] text-text-muted">
                {selected.length} selecionado{selected.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => resetFiltro('meses')} className="text-[11.5px] text-status-danger/70 hover:text-status-danger">
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
