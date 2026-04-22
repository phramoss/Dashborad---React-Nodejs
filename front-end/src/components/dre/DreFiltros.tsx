import { memo, useEffect } from 'react'
import { SlidersHorizontal, RefreshCw, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DreModo } from '@/types'

export interface DreFiltersProps {
  filtros:      { modo: DreModo; data_ini: string; data_fim: string }
  setModo:      (m: DreModo) => void
  setDataIni:   (d: string) => void
  setDataFim:   (d: string) => void
  resetFiltros: () => void
}

export const DreFiltersInline = memo(function DreFiltersInline({
  filtros, setModo, setDataIni, setDataFim, resetFiltros,
}: DreFiltersProps) {
  const currentYear = new Date().getFullYear()
  const isDefault = filtros.data_ini === `${currentYear}-01-01` &&
                    filtros.data_fim === `${currentYear}-12-31` &&
                    filtros.modo === 'caixa'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-text-muted mr-1">
        <SlidersHorizontal size={14} />
        <span className="text-[11.5px] uppercase tracking-widest font-medium">Filtros</span>
      </div>

      <div className="w-px h-5 bg-surface-border" />

      <div className="flex rounded-lg overflow-hidden border border-surface-border h-8">
        <button
          onClick={() => setModo('caixa')}
          className={cn(
            'px-3 text-[11px] font-medium transition-all',
            filtros.modo === 'caixa'
              ? 'bg-brand/15 text-brand border-r border-brand/20'
              : 'text-text-muted hover:text-text-primary bg-surface-light border-r border-surface-border',
          )}
        >
          Caixa
        </button>
        <button
          onClick={() => setModo('competencia')}
          className={cn(
            'px-3 text-[11px] font-medium transition-all',
            filtros.modo === 'competencia'
              ? 'bg-brand/15 text-brand'
              : 'text-text-muted hover:text-text-primary bg-surface-light',
          )}
        >
          Competência
        </button>
      </div>

      <div className="w-px h-5 bg-surface-border" />

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-text-muted">De</span>
        <input
          type="date"
          value={filtros.data_ini}
          onChange={e => setDataIni(e.target.value)}
          className={cn(
            'h-8 px-2 rounded-lg border border-surface-border bg-surface-light text-[11px] text-text-primary',
            'focus:outline-none focus:border-brand/50 transition-colors',
          )}
        />
        <span className="text-[11px] text-text-muted">até</span>
        <input
          type="date"
          value={filtros.data_fim}
          onChange={e => setDataFim(e.target.value)}
          className={cn(
            'h-8 px-2 rounded-lg border border-surface-border bg-surface-light text-[11px] text-text-primary',
            'focus:outline-none focus:border-brand/50 transition-colors',
          )}
        />
      </div>

      {!isDefault && (
        <button
          onClick={resetFiltros}
          className={cn(
            'ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium',
            'text-status-danger/80 hover:text-status-danger',
            'bg-status-danger/5 hover:bg-status-danger/10',
            'border border-status-danger/20 hover:border-status-danger/40',
            'transition-all duration-150',
          )}
        >
          <RefreshCw size={11} />
          Restaurar
        </button>
      )}
    </div>
  )
})

interface DreMobileDrawerProps extends DreFiltersProps {
  open:    boolean
  onClose: () => void
}

export const DreMobileDrawer = memo(function DreMobileDrawer({
  open, onClose, filtros, setModo, setDataIni, setDataFim, resetFiltros,
}: DreMobileDrawerProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'sm:hidden fixed top-0 right-0 h-full z-50 w-[85vw] max-w-[320px]',
          'bg-surface border-l border-surface-border shadow-2xl',
          'overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <SlidersHorizontal size={14} />
            <span className="text-[12px] uppercase tracking-widest font-semibold">Filtros DRE</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2">Modo</p>
            <div className="flex rounded-lg overflow-hidden border border-surface-border">
              <button
                onClick={() => setModo('caixa')}
                className={cn(
                  'flex-1 py-2.5 text-[12px] font-medium transition-all border-r border-surface-border',
                  filtros.modo === 'caixa' ? 'bg-brand/15 text-brand' : 'text-text-muted bg-surface-light',
                )}
              >
                Caixa
              </button>
              <button
                onClick={() => setModo('competencia')}
                className={cn(
                  'flex-1 py-2.5 text-[12px] font-medium transition-all',
                  filtros.modo === 'competencia' ? 'bg-brand/15 text-brand' : 'text-text-muted bg-surface-light',
                )}
              >
                Competência
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2">Período</p>
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-[10px] text-text-muted mb-1">De</p>
                <input
                  type="date"
                  value={filtros.data_ini}
                  onChange={e => setDataIni(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-surface-border bg-surface-light text-[12px] text-text-primary focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <p className="text-[10px] text-text-muted mb-1">Até</p>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={e => setDataFim(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-surface-border bg-surface-light text-[12px] text-text-primary focus:outline-none focus:border-brand/50"
                />
              </div>
            </div>
          </div>
          <div className="h-20" />
        </div>

        <div className="sticky bottom-0 z-10 px-4 py-4 bg-surface border-t border-surface-border flex flex-col gap-2">
          <button
            onClick={() => { resetFiltros(); onClose() }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-status-danger bg-status-danger/10 border border-status-danger/20 hover:bg-status-danger/20 transition-all"
          >
            <RefreshCw size={12} /> Restaurar padrão
          </button>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-text-secondary bg-surface-light border border-surface-border hover:bg-surface-border transition-all"
          >
            Aplicar e fechar
          </button>
        </div>
      </div>
    </>
  )
})

