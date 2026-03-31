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
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Focus search when opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const toggle = useCallback(
    (id: number) => {
      onChange(
        selected.includes(id)
          ? selected.filter((x) => x !== id)
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

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setSearch('') }
    },
    [],
  )

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  )

  // Build trigger label
  const triggerLabel = () => {
    if (selected.length === 0) return placeholder
    if (selected.length <= maxDisplay) {
      return selected
        .map((id) => options.find((o) => o.id === id)?.label ?? String(id))
        .map((l) => truncate(l, 12))
        .join(', ')
    }
    return `${selected.length} selecionados`
  }

  const hasSelection = selected.length > 0

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKey}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs',
          'border transition-all duration-150 min-w-[120px] max-w-[200px]',
          open || hasSelection
            ? 'border-brand/50 bg-brand/5 text-text-primary'
            : 'border-surface-border bg-surface-light text-text-secondary hover:border-surface-border/80 hover:text-text-primary',
        )}
      >
        <span className="text-text-muted text-[10px] uppercase tracking-wider shrink-0">
          {label}
        </span>
        <span className={cn('flex-1 text-left truncate', hasSelection && 'text-brand font-medium')}>
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

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute top-full left-0 mt-1 z-50 w-64',
            'bg-surface border border-surface-border rounded-xl shadow-card',
            'flex flex-col overflow-hidden',
          )}
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-border">
            <Search size={12} className="text-text-muted shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={11} className="text-text-muted hover:text-text-primary" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-text-muted text-center">
                Nenhum resultado
              </p>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt.id as number)
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggle(opt.id as number)}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-3 py-2 text-xs text-left',
                      'hover:bg-surface-light transition-colors',
                      isSelected && 'text-brand',
                    )}
                  >
                    <div
                      className={cn(
                        'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all',
                        isSelected
                          ? 'bg-brand border-brand'
                          : 'border-surface-border',
                      )}
                    >
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
              <span className="text-[10px] text-text-muted">
                {selected.length} selecionado{selected.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => onChange([])}
                className="text-[10px] text-status-danger/70 hover:text-status-danger"
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
