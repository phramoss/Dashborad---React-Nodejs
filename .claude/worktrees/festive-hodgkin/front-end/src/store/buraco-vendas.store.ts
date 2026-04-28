import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { BuracoVendasFiltros } from '@/types'

export const DEFAULT_BV_FILTROS: BuracoVendasFiltros = {
  data_ini:   '',
  data_fim:   '',
  clientes:   [],
  vendedores: [],
  materiais:  [],
  ufs:        [],
  municipios: [],
  mercado:    [],
}

interface BuracoVendasState {
  filtros:      BuracoVendasFiltros
  setFiltros:   (partial: Partial<BuracoVendasFiltros>) => void
  resetFiltros: () => void
}

export const useBVStore = create<BuracoVendasState>()(
  devtools(
    (set) => ({
      filtros:      DEFAULT_BV_FILTROS,
      setFiltros:   (partial) =>
        set((s) => ({ filtros: { ...s.filtros, ...partial } }), false, 'setFiltros'),
      resetFiltros: () =>
        set({ filtros: DEFAULT_BV_FILTROS }, false, 'resetFiltros'),
    }),
    { name: 'BuracoVendas' },
  ),
)

export const useBVFiltros = () => useBVStore((s) => s.filtros)
