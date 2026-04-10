import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { SimuladorFiltros } from '@/types'

interface SimuladorState {
  filtros:      SimuladorFiltros
  setFiltros:   (partial: Partial<SimuladorFiltros>) => void
  resetFiltros: () => void
}

const DEFAULT_FILTROS: SimuladorFiltros = {
  materiais: [],
  blocos:    [],
}

export const useSimuladorStore = create<SimuladorState>()(
  devtools(
    (set) => ({
      filtros:     DEFAULT_FILTROS,

      setFiltros: (partial) =>
        set((s) => ({ filtros: { ...s.filtros, ...partial } }), false, 'setFiltros'),

      resetFiltros: () =>
        set({ filtros: DEFAULT_FILTROS }, false, 'resetFiltros'),
    }),
    { name: 'SimuladorDashboard' },
  ),
)

export const useSimuladorFiltros = () => useSimuladorStore((s) => s.filtros)
