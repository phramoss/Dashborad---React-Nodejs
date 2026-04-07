/**
 * FiltroBar.tsx
 *
 * Desktop  → barra inline no topo com todos os filtros como dropdowns flutuantes
 * Mobile   → drawer lateral da direita, todos os filtros como dropdowns suspensos.
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
import { useActiveCount, useResetFiltros, useFiltrosStore } from '@/store/filtros.store'
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

// ─── Drawer lateral mobile ────────────────────────────────────────────────────
interface DrawerProps extends DropdownsProps {
  open: boolean
  onClose: () => void
  activeCount: number
  onReset: () => void
}

const MobileDrawer = memo(function MobileDrawer({
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
          'sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm',
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
          'sm:hidden fixed top-0 right-0 h-full z-50',
          'w-[85vw] max-w-[340px]',
          'bg-surface border-l border-surface-border shadow-2xl',
          // O drawer inteiro scrolla — sem flex-col
          'overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header — sticky no topo durante scroll */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-surface border-b border-surface-border">
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
            aria-label="Fechar filtros"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Conteúdo — SEM overflow restrito para não cortar os dropdowns absolutos */}
        <div className="px-4 py-4 flex flex-col gap-3">

          {/* Label de seção */}
          <p className="text-[10px] text-text-muted uppercase tracking-widest">Período</p>

          {/* Ano — dropdown suspenso */}
          <FiltroAnosSelect />

          {/* Mês — dropdown suspenso */}
          <FiltroMesesSelect />

          {/* Separador */}
          <div className="w-full h-px bg-surface-border my-1" />

          <p className="text-[10px] text-text-muted uppercase tracking-widest">Dimensões</p>

          {/* Cliente / Vendedor / Material / Grupo */}
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
        <div className="sticky bottom-0 z-10 px-4 py-4 bg-surface border-t border-surface-border flex flex-col gap-2">
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
              'bg-surface-light border border-surface-border',
              'hover:bg-surface-border active:scale-[0.98] transition-all',
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
export const FiltroBar = memo(function FiltroBar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeCount  = useActiveCount()
  const resetFiltros = useResetFiltros()
  const { filtros, setClientes, setVendedores, setMateriais, setGrupos } = useFiltrosStore()
  const { data: opts, isLoading } = useFiltrosDisponiveis()

  const handleClose = useCallback(() => setDrawerOpen(false), [])
  const handleReset = useCallback(() => { resetFiltros() }, [resetFiltros])

  const sharedProps: DropdownsProps = {
    opts, filtros, setClientes, setVendedores, setMateriais, setGrupos, isLoading,
  }

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          DESKTOP — barra inline, todos como dropdowns flutuantes
          ══════════════════════════════════════════════════════ */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-text-muted mr-1">
          <SlidersHorizontal size={14} />
          <span className="text-[11.5px] uppercase tracking-widest font-medium">Filtros</span>
        </div>

        <div className="w-px h-5 bg-surface-border" />

        <FiltroAnosSelect />
        <FiltroMesesSelect />

        <div className="w-px h-5 bg-surface-border" />

        <FilterDropdowns {...sharedProps} />

        {activeCount > 0 && (
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
            Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE — drawer lateral + botão flutuante
          ══════════════════════════════════════════════════════ */}
      <MobileDrawer
        open={drawerOpen}
        onClose={handleClose}
        onReset={handleReset}
        activeCount={activeCount}
        {...sharedProps}
      />

      <button
        onClick={() => setDrawerOpen(v => !v)}
        className={cn(
          'sm:hidden fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full shadow-2xl',
          'flex items-center justify-center',
          'transition-all duration-200 active:scale-95',
          activeCount > 0
            ? 'bg-brand shadow-brand/30 text-surface-dark'
            : 'bg-surface border border-surface-border/80 text-text-muted hover:border-brand/40 hover:text-brand',
        )}
        aria-label="Abrir filtros"
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
