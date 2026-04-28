import { memo, useEffect } from 'react'
import { SlidersHorizontal, RefreshCw, ChevronRight } from 'lucide-react'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { cn } from '@/lib/utils'
import type { SimuladorFiltros } from '@/types'

export const TRIG = 'h-8 text-[11px] min-w-[120px]'

export const SITUACAO_OPTIONS = [
  { id: 1, label: 'DISPONIVEL' },
  { id: 2, label: 'RESERVADO' },
  { id: 3, label: 'VENDIDO' },
]

export function sitToIds(sit: string[]): number[] {
  return sit.map(v => SITUACAO_OPTIONS.find(o => o.label === v)?.id ?? 0).filter(Boolean)
}

export function idsToSit(ids: number[]): string[] {
  return ids.map(id => SITUACAO_OPTIONS.find(o => o.id === id)?.label ?? '').filter(Boolean)
}

export interface SimFiltrosProps {
  filtros:      SimuladorFiltros
  setFiltros:   (p: Partial<SimuladorFiltros>) => void
  resetFiltros: () => void
  disponiveis?: { materiais: { id: number; label: string }[]; blocos: number[] }
  loading?:     boolean
}

export const SimFiltrosInline = memo(function SimFiltrosInline({
  filtros, setFiltros, resetFiltros, disponiveis, loading,
}: SimFiltrosProps) {
  const materiais   = disponiveis?.materiais ?? []
  const blocos      = (disponiveis?.blocos ?? []).map(b => ({ id: b, label: String(b) }))
  const sitSelected = sitToIds(filtros.situacao)
  const activeCount = filtros.materiais.length + filtros.blocos.length + filtros.situacao.length

  return (
    <div className="rounded-xl bg-surface border border-surface-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-text-muted shrink-0">
          <SlidersHorizontal size={14} />
          <span className="text-[11px] font-medium uppercase tracking-wider">Filtros</span>
          {activeCount > 0 && (
            <span className="bg-brand/15 text-brand text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <MultiSelect
            label="Material"
            options={materiais}
            selected={filtros.materiais}
            onChange={ids => setFiltros({ materiais: ids })}
            placeholder="Todos"
            loading={loading}
            triggerClassName={TRIG}
          />
          <MultiSelect
            label="Nº Bloco"
            options={blocos}
            selected={filtros.blocos}
            onChange={ids => setFiltros({ blocos: ids })}
            placeholder="Todos"
            loading={loading}
            triggerClassName={TRIG}
          />
          <MultiSelect
            label="Situação"
            options={SITUACAO_OPTIONS}
            selected={sitSelected}
            onChange={ids => setFiltros({ situacao: idsToSit(ids) })}
            placeholder="Todas"
            triggerClassName={TRIG}
          />
        </div>
        {activeCount > 0 && (
          <button
            onClick={resetFiltros}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs border border-status-danger/30 text-status-danger/70 hover:text-status-danger hover:border-status-danger/60 transition-all shrink-0"
          >
            <RefreshCw size={11} />
            Limpar
          </button>
        )}
      </div>
    </div>
  )
})

export interface SimMobileDrawerProps {
  open:         boolean
  onClose:      () => void
  filtros:      SimuladorFiltros
  setFiltros:   (p: Partial<SimuladorFiltros>) => void
  resetFiltros: () => void
  disponiveis?: { materiais: { id: number; label: string }[]; blocos: number[] }
  loading?:     boolean
}

export const SimMobileDrawer = memo(function SimMobileDrawer({
  open, onClose, filtros, setFiltros, resetFiltros, disponiveis, loading,
}: SimMobileDrawerProps) {
  const materiais   = disponiveis?.materiais ?? []
  const blocos      = (disponiveis?.blocos ?? []).map(b => ({ id: b, label: String(b) }))
  const sitSelected = sitToIds(filtros.situacao)
  const activeCount = filtros.materiais.length + filtros.blocos.length + filtros.situacao.length

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
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed top-0 right-0 h-full z-50 w-[85vw] max-w-[320px]',
          'bg-surface border-l border-surface-border shadow-2xl',
          'overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <SlidersHorizontal size={14} />
            <span className="text-[12px] uppercase tracking-widest font-semibold">Filtros</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand/20 text-brand text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          <MultiSelect label="Material"  options={materiais}        selected={filtros.materiais}  onChange={ids => setFiltros({ materiais: ids })}                      loading={loading} />
          <MultiSelect label="Nº Bloco"  options={blocos}           selected={filtros.blocos}     onChange={ids => setFiltros({ blocos: ids })}                         loading={loading} />
          <MultiSelect label="Situação"  options={SITUACAO_OPTIONS} selected={sitSelected}         onChange={ids => setFiltros({ situacao: idsToSit(ids) })} />
          <div className="h-24" />
        </div>

        <div className="sticky bottom-0 z-10 px-4 py-4 bg-surface border-t border-surface-border flex flex-col gap-2">
          {activeCount > 0 && (
            <button
              onClick={() => { resetFiltros(); onClose() }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-status-danger bg-status-danger/10 border border-status-danger/20 hover:bg-status-danger/20 transition-all"
            >
              <RefreshCw size={12} /> Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
            </button>
          )}
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
