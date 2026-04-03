/**
 * MultiSelect.tsx
 *
 * Dropdown de seleção múltipla com busca.
 * Usa position:fixed calculado via getBoundingClientRect — funciona
 * corretamente dentro de qualquer container com overflow (drawer mobile, etc.)
 * sem ser cortado.
 */
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
  type KeyboardEvent,
} from 'react'
import { ChevronDown, X, Search, Check } from 'lucide-react'
import { cn, truncate } from '@/lib/utils'
import type { FiltroOption } from '@/types'

interface MultiSelectProps {
  label: string
  options: FiltroOption[]
  selected: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
  maxDisplay?: number
  loading?: boolean
}

// ID único por instância para isolar cliques fora do dropdown
let _uid = 0

export const MultiSelect = memo(function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Todos',
  maxDisplay = 2,
  loading = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropId = useRef(`multiselect-drop-${++_uid}`).current

  // Calcula posição fixed ao abrir
  function openDropdown() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 256) })
    setOpen(true)
  }

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      const drop = document.getElementById(dropId)
      if (drop?.contains(target)) return
      setOpen(false)
      setSearch('')
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open, dropId])

  // Reposiciona ao scroll; fecha ao Escape
  useEffect(() => {
    if (!open) return
    const onScroll = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 256) })
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open])

  // Foca busca ao abrir
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const toggle = useCallback(
    (id: number) => {
      onChange(
        selected.includes(id)
          ? selected.filter(x => x !== id)
          : [...selected, id],
      )
    },
    [selected, onChange],
  )

  const clear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange([])
    },
    [onChange],
  )

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setSearch('') }
  }, [])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  )

  const triggerLabel = () => {
    if (selected.length === 0) return placeholder
    if (selected.length <= maxDisplay) {
      return selected
        .map(id => options.find(o => o.id === id)?.label ?? String(id))
        .map(l => truncate(l, 12))
        .join(', ')
    }
    return `${selected.length} selecionados`
  }

  const hasSelection = selected.length > 0

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKey}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? (setOpen(false), setSearch('')) : openDropdown()}
        className={cn(
          'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs',
          'border transition-all duration-150 min-w-[120px] max-w-[200px] w-full',
          open || hasSelection
            ? 'border-brand/50 bg-brand/5 text-text-primary'
            : 'border-surface-border bg-surface-light text-text-secondary hover:border-surface-border/80 hover:text-text-primary',
        )}
      >
        <span className="text-text-muted text-[11.5px] uppercase tracking-wider shrink-0">
          {label}
        </span>
        <span className={cn('flex-1 text-left truncate text-[13.5px]', hasSelection && 'text-brand font-medium')}>
          {loading ? '...' : triggerLabel()}
        </span>
        {hasSelection ? (
          <X size={11} className="text-text-muted hover:text-status-danger shrink-0" onClick={clear} />
        ) : (
          <ChevronDown
            size={11}
            className={cn('text-text-muted shrink-0 transition-transform', open && 'rotate-180')}
          />
        )}
      </button>

      {/* Dropdown — position:fixed para funcionar dentro de overflow:auto */}
      {open && dropPos && (
        <div
          id={dropId}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-surface border border-surface-border rounded-xl shadow-card flex flex-col overflow-hidden"
        >
          {/* Busca */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-border">
            <Search size={12} className="text-text-muted shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 bg-transparent text-[13.5px] text-text-primary placeholder:text-text-muted outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={11} className="text-text-muted hover:text-text-primary" />
              </button>
            )}
          </div>

          {/* Opções */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[13.5px] text-text-muted text-center">
                Nenhum resultado
              </p>
            ) : (
              filtered.map(opt => {
                const isSelected = selected.includes(opt.id as number)
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggle(opt.id as number)}
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
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="border-t border-surface-border px-3 py-2 flex items-center justify-between">
              <span className="text-[11.5px] text-text-muted">
                {selected.length} selecionado{selected.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => onChange([])}
                className="text-[11.5px] text-status-danger/70 hover:text-status-danger"
              >
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
