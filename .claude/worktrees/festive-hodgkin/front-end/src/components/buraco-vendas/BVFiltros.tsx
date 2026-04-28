import { memo, useMemo, useCallback, useEffect } from 'react'
import { SlidersHorizontal, RefreshCw, ChevronRight } from 'lucide-react'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { cn } from '@/lib/utils'
import { useBVStore } from '@/store/buraco-vendas.store'
import { useFiltrosDisponiveis } from '@/hooks/useFiltrosDisponiveis'
import { useBVUfs, useBVMercados } from '@/hooks/useBuracoVendasData'

interface BVMobileDrawerProps {
  open:    boolean
  onClose: () => void
}

export const BVMobileDrawer = memo(function BVMobileDrawer({ open, onClose }: BVMobileDrawerProps) {
  const { filtros, setFiltros, resetFiltros } = useBVStore()
  const { data: opts, isLoading: optsLoading } = useFiltrosDisponiveis()
  const { data: ufsRaw  = [] } = useBVUfs()
  const { data: mercRaw = [] } = useBVMercados()

  const clienteOpts  = useMemo(() => opts?.clientes  ?? [], [opts])
  const vendedorOpts = useMemo(() => opts?.vendedores ?? [], [opts])
  const matOpts      = useMemo(() => opts?.materiais  ?? [], [opts])

  const ufOpts = useMemo(() => ufsRaw.map((uf, i) => ({ id: i + 1, label: uf })), [ufsRaw])
  const ufSelected = useMemo(
    () => filtros.ufs.map(v => ufsRaw.indexOf(v) + 1).filter(id => id > 0),
    [filtros.ufs, ufsRaw],
  )
  const handleUfChange = useCallback(
    (ids: number[]) => setFiltros({ ufs: ids.map(id => ufsRaw[id - 1]).filter(Boolean) }),
    [ufsRaw, setFiltros],
  )

  const mercOpts = useMemo(() => mercRaw.map((m, i) => ({ id: i + 1, label: m })), [mercRaw])
  const mercSelected = useMemo(
    () => filtros.mercado.map(v => mercRaw.indexOf(v) + 1).filter(id => id > 0),
    [filtros.mercado, mercRaw],
  )
  const handleMercChange = useCallback(
    (ids: number[]) => setFiltros({ mercado: ids.map(id => mercRaw[id - 1]).filter(Boolean) }),
    [mercRaw, setFiltros],
  )

  const activeCount =
    filtros.clientes.length + filtros.vendedores.length + filtros.materiais.length +
    filtros.ufs.length + filtros.mercado.length +
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)

  const today = new Date().toISOString().slice(0, 10)

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
          <MultiSelect label="Mercado"  options={mercOpts}     selected={mercSelected}       onChange={handleMercChange} loading={optsLoading} />
          <MultiSelect label="Vendedor" options={vendedorOpts} selected={filtros.vendedores}  onChange={(ids) => setFiltros({ vendedores: ids as number[] })} loading={optsLoading} />
          <MultiSelect label="Estado"   options={ufOpts}       selected={ufSelected}          onChange={handleUfChange} />
          <MultiSelect label="Cliente"  options={clienteOpts}  selected={filtros.clientes}    onChange={(ids) => setFiltros({ clientes: ids as number[] })}   loading={optsLoading} />
          <MultiSelect label="Material" options={matOpts}      selected={filtros.materiais}   onChange={(ids) => setFiltros({ materiais: ids as number[] })}  loading={optsLoading} />

          <div className="w-full h-px bg-surface-border my-1" />
          <p className="text-[9px] text-text-muted uppercase tracking-widest">Período</p>
          <input type="date" value={filtros.data_ini} max={today}
            onChange={(e) => setFiltros({ data_ini: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-surface border border-surface-border text-text-primary focus:outline-none focus:border-brand/50" />
          <input type="date" value={filtros.data_fim} max={today}
            onChange={(e) => setFiltros({ data_fim: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-surface border border-surface-border text-text-primary focus:outline-none focus:border-brand/50" />
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
