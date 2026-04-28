import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { DreFiltros, DreModo } from '@/types'

interface DreState {
  filtros:      DreFiltros
  setModo:      (modo: DreModo) => void
  setDataIni:   (d: string) => void
  setDataFim:   (d: string) => void
  resetFiltros: () => void
}

const currentYear = new Date().getFullYear()

const DEFAULT_FILTROS: DreFiltros = {
  modo:     'caixa',
  data_ini: `${currentYear}-01-01`,
  data_fim: `${currentYear}-12-31`,
}

export const useDreStore = create<DreState>()(
  devtools(
    (set) => ({
      filtros: DEFAULT_FILTROS,

      setModo: (modo) =>
        set((s) => ({ filtros: { ...s.filtros, modo } }), false, 'setModo'),

      setDataIni: (data_ini) =>
        set((s) => ({ filtros: { ...s.filtros, data_ini } }), false, 'setDataIni'),

      setDataFim: (data_fim) =>
        set((s) => ({ filtros: { ...s.filtros, data_fim } }), false, 'setDataFim'),

      resetFiltros: () =>
        set({ filtros: DEFAULT_FILTROS }, false, 'resetFiltros'),
    }),
    { name: 'DreDashboard' },
  ),
)

export const useDreFiltros = () => useDreStore((s) => s.filtros)
