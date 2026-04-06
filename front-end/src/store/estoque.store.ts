import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { EstoqueFiltros } from '@/types'

interface EstoqueState {
  filtros: EstoqueFiltros
  setFiltros:           (partial: Partial<EstoqueFiltros>) => void
  setMaterialFiltro:    (codMa: number | null) => void
  resetFiltros:         () => void
}

export const DEFAULT_ESTOQUE_FILTROS: EstoqueFiltros = {
  empresas:         [],
  materiais:        [],
  blocos:           [],
  espessuras:       [],
  industrializacao: [],
  situacao:         [],
  data_ini:         '',
  data_fim:         '',
  materialFiltro:   null,
}

export const useEstoqueStore = create<EstoqueState>()(
  devtools(
    (set) => ({
      filtros: DEFAULT_ESTOQUE_FILTROS,

      setFiltros: (partial) =>
        set((s) => ({ filtros: { ...s.filtros, ...partial } }), false, 'setFiltros'),

      setMaterialFiltro: (codMa) =>
        set((s) => ({ filtros: { ...s.filtros, materialFiltro: codMa } }), false, 'setMaterialFiltro'),

      resetFiltros: () =>
        set({ filtros: DEFAULT_ESTOQUE_FILTROS }, false, 'resetFiltros'),
    }),
    { name: 'EstoqueDashboard' },
  ),
)

export const useEstoqueFiltros = () => useEstoqueStore((s) => s.filtros)
