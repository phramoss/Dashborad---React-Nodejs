import { memo } from 'react'
import { SlidersHorizontal, RefreshCw } from 'lucide-react'
import { FiltroAnos } from './FiltroAnos'
import { FiltroGranularidade } from './FiltroGranularidade'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { useActiveCount, useResetFiltros, useFiltrosStore } from '@/store/filtros.store'
import { useFiltrosDisponiveis } from '@/hooks/useFiltrosDisponiveis'
import { cn } from '@/lib/utils'

export const FiltroBar = memo(function FiltroBar() {
  const activeCount = useActiveCount()
  const resetFiltros = useResetFiltros()
  const { filtros, setClientes, setVendedores, setMateriais, setGrupos } = useFiltrosStore()
  const { data: opts, isLoading } = useFiltrosDisponiveis()

  return (
    <div className="flex items-center gap-3 flex-wrap">

      {/* Icon */}
      <div className="flex items-center gap-1.5 text-text-muted">
        <SlidersHorizontal size={13} />
        <span className="text-[10px] uppercase tracking-widest font-medium">Filtros</span>
      </div>

      <div className="w-px h-5 bg-surface-border" />

      {/* Anos pills */}
      <FiltroAnos />

      <div className="w-px h-5 bg-surface-border" />

      {/* Dropdowns */}
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

      <div className="w-px h-5 bg-surface-border" />

      {/* Granularidade */}
      <FiltroGranularidade />

      {/* Reset — só aparece com filtros ativos */}
      {activeCount > 0 && (
        <button
          onClick={resetFiltros}
          className={cn(
            'ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
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
  )
})
