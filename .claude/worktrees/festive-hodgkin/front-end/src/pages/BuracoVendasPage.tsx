import { useState } from 'react'
import { Layers, Box, Filter } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import { useBVStore } from '@/store/buraco-vendas.store'
import {
  useBVSequencia,
  useBVEstoqueFaturamento,
  useBVMateriaisComprados,
  useBVChapa,
  useBVBloco,
} from '@/hooks/useBuracoVendasData'
import type { MatrizSort } from '@/types'

import { BVSequenciaMatriz } from '@/components/buraco-vendas/BVSequenciaMatriz'
import { BVFatHierarchyMatriz } from '@/components/buraco-vendas/BVFatHierarchyMatriz'
import { BVMateriaisComprados } from '@/components/buraco-vendas/BVMateriaisComprados'
import { BVHierarchyTable } from '@/components/buraco-vendas/BVHierarchyTable'
import { BVMobileDrawer } from '@/components/buraco-vendas/BVFiltros'
import { CHAPA_HEADERS, CHAPA_FIELDS, BLOCO_HEADERS, BLOCO_FIELDS } from '@/components/buraco-vendas/bv-helpers'

export function BuracoVendasPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { filtros, setFiltros } = useBVStore()

  const activeCount =
    filtros.clientes.length + filtros.vendedores.length + filtros.materiais.length +
    filtros.ufs.length + filtros.municipios.length + filtros.mercado.length +
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)

  const [seqSort, setSeqSort] = useState<MatrizSort>({ col: null, dir: null })
  const [fatSort, setFatSort] = useState<MatrizSort>({ col: null, dir: null })
  const { data: seqData,   isLoading: seqLoading   } = useBVSequencia(seqSort)
  const { data: fatData,   isLoading: fatLoading   } = useBVEstoqueFaturamento(fatSort)
  const { data: matData,   isLoading: matLoading   } = useBVMateriaisComprados()
  const { data: chapaData, isLoading: chapaLoading } = useBVChapa()
  const { data: blocoData, isLoading: blocoLoading } = useBVBloco()

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">

      <ErrorBoundary>
        <BVSequenciaMatriz
          data={seqData} loading={seqLoading}
          filtros={filtros} onFilter={setFiltros} onSortChange={setSeqSort}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <BVFatHierarchyMatriz
          data={fatData} loading={fatLoading}
          filtros={filtros} onFilter={setFiltros} onSortChange={setFatSort}
        />
      </ErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ErrorBoundary>
          <BVMateriaisComprados data={matData} loading={matLoading} />
        </ErrorBoundary>
        <ErrorBoundary>
          <BVHierarchyTable
            title="Chapa / Recortado" icon={<Layers size={12} className="text-brand" />}
            headers={CHAPA_HEADERS} fields={CHAPA_FIELDS} endpoint="chapa"
            data={chapaData} loading={chapaLoading} filtros={filtros} onFilter={setFiltros}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <BVHierarchyTable
            title="Bloco" icon={<Box size={12} className="text-brand" />}
            headers={BLOCO_HEADERS} fields={BLOCO_FIELDS} endpoint="bloco"
            data={blocoData} loading={blocoLoading} filtros={filtros} onFilter={setFiltros}
          />
        </ErrorBoundary>
      </div>

      <BVMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <button
        onClick={() => setDrawerOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl',
          'flex items-center justify-center transition-all duration-200 active:scale-95',
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
    </div>
  )
}
