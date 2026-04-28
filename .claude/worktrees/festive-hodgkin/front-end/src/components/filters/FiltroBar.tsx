/**
 * FiltroBar.tsx
 *
 * Único modo de acesso aos filtros em desktop e mobile:
 * botão FAB fixo no canto inferior direito → drawer lateral da direita.
 *
 * CORREÇÃO DO CLIPPING:
 * O overflow-y:auto no wrapper de conteúdo criava um stacking context que
 * cortava os dropdowns position:absolute dos selects.
 * Solução: o drawer inteiro (fixed) é overflow-y:auto; o conteúdo interno
 * não tem overflow restrito; o footer usa sticky bottom-0 para ficar colado.
 */

import { memo, useEffect, useCallback, useState } from 'react'
import { SlidersHorizontal, RefreshCw, Filter, ChevronRight } from 'lucide-react'
import { FiltroAnosSelect } from './FiltroAnosSelect'
import { FiltroMesesSelect } from './FiltroMesesSelect'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { useActiveCount, useResetFiltros, useFiltrosStore, useFiltros } from '@/store/filtros.store'
import { useFiltrosDisponiveis } from '@/hooks/useFiltrosDisponiveis'
import { cn } from '@/lib/utils'
import type { FiltroDashboard, FiltrosDisponiveis } from '@/types'

// ─── Props dos dropdowns de dimensão ─────────────────────────────────────────
interface DropdownsProps {
  opts: FiltrosDisponiveis | undefined
  filtros: FiltroDashboard
  setClientes: (ids: number[]) => void
  setVendedores: (ids: number[]) => void
  setMateriais: (ids: number[]) => void
  setGrupos: (ids: number[]) => void
  isLoading: boolean
}

function FilterDropdowns({
  opts, filtros, setClientes, setVendedores, setMateriais, setGrupos, isLoading,
}: DropdownsProps) {
  return (
    <>
      <MultiSelect
        label="Cliente"
        options={opts?.clientes ?? []}
        selected={filtros.clientes}
        onChange={setClientes}
        loading={isLoading}
      />
      <MultiSelect
        label="Vendedor"
        options={opts?.vendedores ?? []}
        selected={filtros.vendedores}
        onChange={setVendedores}
        loading={isLoading}
      />
      <MultiSelect
        label="Material"
        options={opts?.materiais ?? []}
        selected={filtros.materiais}
        onChange={setMateriais}
        loading={isLoading}
      />
      <MultiSelect
        label="Grupo"
        options={opts?.grupos ?? []}
        selected={filtros.grupos}
        onChange={setGrupos}
        loading={isLoading}
      />
    </>
  )
}

// ─── Drawer lateral (desktop + mobile) ───────────────────────────────────────
interface DrawerProps extends DropdownsProps {
  open: boolean
  onClose: () => void
  activeCount: number
  onReset: () => void
}

const FilterDrawer = memo(function FilterDrawer({
  open, onClose, activeCount, onReset,
  opts, filtros, setClientes, setVendedores, setMateriais, setGrupos, isLoading,
}: DrawerProps) {
  // Fecha ao Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Trava scroll do body enquanto aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm',
          'transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        className={cn(
          'fixed top-0 right-0 h-full z-50',
          'w-[85vw] max-w-[340px]',
          'bg-[var(--filter-bg)] border-l border-[var(--border)] shadow-2xl',
          // O drawer inteiro scrolla — sem flex-col
          'overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header — sticky no topo durante scroll */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-[var(--filter-bg)] border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-text-secondary">
            <SlidersHorizontal size={14} />
            <span className="text-[12px] uppercase tracking-widest font-semibold">Filtros</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand/20 text-[#428D94] text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[var(--surface)] transition-all"
            aria-label="Fechar filtros"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Conteúdo — SEM overflow restrito para não cortar os dropdowns absolutos */}
        <div className="px-4 py-4 flex flex-col gap-3">

          <p className="text-[10px] text-text-muted uppercase tracking-widest">Período</p>

          <FiltroAnosSelect />
          <FiltroMesesSelect />

          <div className="w-full h-px bg-[var(--border)] my-1" />

          <p className="text-[10px] text-text-muted uppercase tracking-widest">Dimensões</p>

          <FilterDropdowns
            opts={opts} filtros={filtros}
            setClientes={setClientes} setVendedores={setVendedores}
            setMateriais={setMateriais} setGrupos={setGrupos}
            isLoading={isLoading}
          />

          {/* Espaço extra no final para o footer sticky não cobrir o último item */}
          <div className="h-32" />
        </div>

        {/* Footer — sticky no rodapé durante scroll */}
        <div className="sticky bottom-0 z-10 px-4 py-4 bg-[var(--filter-bg)] border-t border-[var(--border)] flex flex-col gap-2">
          {activeCount > 0 && (
            <button
              onClick={() => { onReset(); onClose() }}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg',
                'text-[12px] font-medium text-status-danger',
                'bg-status-danger/10 border border-status-danger/20',
                'hover:bg-status-danger/20 active:scale-[0.98] transition-all',
              )}
            >
              <RefreshCw size={12} />
              Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={onClose}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg',
              'text-[12px] font-medium text-text-secondary',
              'bg-[var(--surface)] border border-[var(--border)]',
              'hover:bg-[var(--surface-light)] active:scale-[0.98] transition-all',
            )}
          >
            Aplicar e fechar
          </button>
        </div>
      </div>
    </>
  )
})

// ─── Componente principal ─────────────────────────────────────────────────────
interface FiltroBarProps {
  vertical?: boolean
}

export const FiltroBar = memo(function FiltroBar({ vertical }: FiltroBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeCount   = useActiveCount()
  const resetFiltros  = useResetFiltros()
  const filtros       = useFiltros()
  const setClientes   = useFiltrosStore((s) => s.setClientes)
  const setVendedores = useFiltrosStore((s) => s.setVendedores)
  const setMateriais  = useFiltrosStore((s) => s.setMateriais)
  const setGrupos     = useFiltrosStore((s) => s.setGrupos)
  const { data: opts, isLoading } = useFiltrosDisponiveis()

  const handleClose = useCallback(() => setDrawerOpen(false), [])
  const handleReset = useCallback(() => { resetFiltros() }, [resetFiltros])

  const sharedProps: DropdownsProps = {
    opts, filtros, setClientes, setVendedores, setMateriais, setGrupos, isLoading,
  }

  // ── Vertical mode (sidebar) ───────────────────────────────────────────────
  if (vertical) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[9px] text-white/40 uppercase tracking-widest">Período</p>
        <FiltroAnosSelect />
        <FiltroMesesSelect />
        <div className="w-full h-px bg-white/10 my-0.5" />
        <p className="text-[9px] text-white/40 uppercase tracking-widest">Dimensões</p>
        <FilterDropdowns {...sharedProps} />
        {activeCount > 0 && (
          <button
            onClick={resetFiltros}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium mt-1',
              'text-red-300/80 hover:text-red-300',
              'bg-red-500/10 hover:bg-red-500/15',
              'border border-red-500/20 hover:border-red-500/30',
              'transition-all duration-150',
            )}
          >
            <RefreshCw size={10} />
            Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
    )
  }

  // ── Modo padrão: FAB + drawer (desktop e mobile) ──────────────────────────
  return (
    <>
      <FilterDrawer
        open={drawerOpen}
        onClose={handleClose}
        onReset={handleReset}
        activeCount={activeCount}
        {...sharedProps}
      />

      <button
        onClick={() => setDrawerOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full shadow-2xl',
          'flex items-center justify-center',
          'transition-all duration-200 active:scale-95',
          activeCount > 0
            ? 'bg-brand shadow-brand/30 text-surface-dark'
            : 'bg-[var(--filter-bg)] border border-[var(--border)] text-text-muted hover:border-brand/40 hover:text-brand',
        )}
        aria-label={drawerOpen ? 'Fechar filtros' : 'Abrir filtros'}
      >
        <Filter size={22} />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-status-danger text-white text-[10px] font-bold flex items-center justify-center shadow">
            {activeCount > 9 ? '9+' : activeCount}
          </span>
        )}
      </button>
    </>
  )
})
