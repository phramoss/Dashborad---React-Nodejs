/**
 * FiltroAnosSelect.tsx
 *
 * Dropdown de Ano no padrão visual do MultiSelect.
 * Usa position:fixed calculado via getBoundingClientRect para funcionar
 * corretamente dentro do drawer mobile (overflow:auto) sem ser cortado.
 */
import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { useFiltrosStore } from '@/store/filtros.store'
import { useFiltrosDisponiveis } from '@/hooks/useFiltrosDisponiveis'
import { cn } from '@/lib/utils'

export const FiltroAnosSelect = memo(function FiltroAnosSelect() {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { filtros, toggleAno, resetFiltro } = useFiltrosStore()
  const { data: opts, isLoading } = useFiltrosDisponiveis()
  const selected = filtros.anos
  const anos = opts?.anos ?? []

  // Calcula posição fixed ao abrir
  function openDropdown() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 176) })
    setOpen(true)
  }

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      // Verifica se clicou no dropdown (que está no body via fixed)
      const drop = document.getElementById('anos-dropdown')
      if (drop?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  // Fecha ao Escape e ao scroll (reposiciona)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 176) })
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
    resetFiltro('anos')
  }, [resetFiltro])

  const hasSelection = selected.length > 0

  const triggerLabel = () => {
    if (isLoading) return '...'
    if (!hasSelection) return 'Todos'
    if (selected.length === 1) return String(selected[0])
    return `${selected.length} anos`
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
            ? 'border-brand/50 bg-brand/5 text-text-primary'
            : 'border-surface-border bg-surface-light text-text-secondary hover:border-surface-border/80 hover:text-text-primary',
        )}
      >
        <span className="text-text-muted text-[11.5px] uppercase tracking-wider shrink-0">Ano</span>
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
          id="anos-dropdown"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-surface border border-surface-border rounded-xl shadow-card flex flex-col overflow-hidden"
        >
          <div className="max-h-52 overflow-y-auto py-1">
            {anos.length === 0 ? (
              <p className="px-3 py-3 text-[13.5px] text-text-muted text-center">Carregando...</p>
            ) : (
              anos.map(ano => {
                const isSelected = selected.includes(ano)
                return (
                  <button
                    key={ano}
                    onClick={() => toggleAno(ano)}
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
                    <span>{ano}</span>
                  </button>
                )
              })
            )}
          </div>
          {hasSelection && (
            <div className="border-t border-surface-border px-3 py-2 flex items-center justify-between">
              <span className="text-[11.5px] text-text-muted">
                {selected.length} selecionado{selected.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => resetFiltro('anos')} className="text-[11.5px] text-status-danger/70 hover:text-status-danger">
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
