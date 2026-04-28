import { useState } from 'react'
import { TrendingDown, Grid3X3, Box, LayoutTemplate, Layers, Filter } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { useEstoqueStore } from '@/store/estoque.store'
import { useEstoqueKpi, useEstoqueChapa, useEstoqueBloco, useEstoqueFaturamentoMatriz } from '@/hooks/useEstoqueData'
import type { MatrizSort } from '@/types'

import { KpiBlock } from '@/components/estoque/EstoqueKpi'
import { HierarchyTable } from '@/components/estoque/EstoqueHierarchyTable'
import { HierarchyMatriz } from '@/components/estoque/EstoqueHierarchyMatriz'
import { EstoqueMobileDrawer } from '@/components/estoque/EstoqueFiltros'
import { CHAPA_HEADERS, CHAPA_FIELDS, BLOCO_HEADERS, BLOCO_FIELDS } from '@/components/estoque/estoque-helpers'
import { fmtNum, fmtInt } from '@/lib/utils'

export function EstoquePage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { filtros, setFiltros } = useEstoqueStore()

  const activeCount =
    filtros.empresas.length + filtros.materiais.length + filtros.blocos.length +
    filtros.espessuras.length + filtros.industrializacao.length + filtros.situacao.length +
    filtros.grupos.length + filtros.chapas.length + filtros.lotes.length + filtros.unidades.length +
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)

  const [matrizSort, setMatrizSort] = useState<MatrizSort>({ col: null, dir: null })
  const { data: kpiData,    isLoading: kpiLoading   } = useEstoqueKpi()
  const { data: chapaData,  isLoading: chapaLoading  } = useEstoqueChapa()
  const { data: blocoData,  isLoading: blocoLoading  } = useEstoqueBloco()
  const { data: matrizData, isLoading: matrizLoading } = useEstoqueFaturamentoMatriz(matrizSort)

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">

      {/* KPI Cards */}
      <ErrorBoundary>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiBlock title="Custo Total" value={formatCurrency(kpiData?.custoTotal ?? 0, true)}
            icon={TrendingDown} accent="text-brand" loading={kpiLoading} />
          <KpiBlock title="Total M²" value={formatNumber(kpiData?.totalM2 ?? 0)}
            subtitle={`Qtde: ${formatNumber(kpiData?.qtdM2 ?? 0, 0)}`}
            icon={Grid3X3} accent="text-chart-blue" loading={kpiLoading} />
          <KpiBlock title="Total M³" value={fmtNum(kpiData?.totalM3 ?? 0)}
            subtitle={`Qtde: ${fmtInt(kpiData?.qtdM3 ?? 0)}`}
            icon={Box} accent="text-chart-purple" loading={kpiLoading} />
          <KpiBlock title="Cavalete" value={String(kpiData?.cavaletes ?? 0)}
            icon={LayoutTemplate} accent="text-chart-orange" loading={kpiLoading} />
        </div>
      </ErrorBoundary>

      {/* Tabelas CHAPA + BLOCO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ErrorBoundary>
          <HierarchyTable
            icon={Layers} title="Chapa / Recortado"
            headers={CHAPA_HEADERS} fields={CHAPA_FIELDS} endpoint="chapa"
            data={chapaData} loading={chapaLoading} filtros={filtros} onFilter={setFiltros}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <HierarchyTable
            icon={Box} title="Bloco"
            headers={BLOCO_HEADERS} fields={BLOCO_FIELDS} endpoint="bloco"
            data={blocoData} loading={blocoLoading} filtros={filtros} onFilter={setFiltros}
          />
        </ErrorBoundary>
      </div>

      {/* Matriz faturamento */}
      <ErrorBoundary>
        <HierarchyMatriz
          data={matrizData} loading={matrizLoading}
          filtros={filtros} onFilter={setFiltros} onSortChange={setMatrizSort}
        />
      </ErrorBoundary>

      {/* Drawer filtros */}
      <EstoqueMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* FAB */}
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
