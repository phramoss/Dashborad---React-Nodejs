import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { EstoqueFiltros, EstoqueDrillState, EstoqueDrillNode } from '@/types'

// Drill inicial vazio
const DEFAULT_DRILL: EstoqueDrillState = { nivel: 0, path: [] }

interface EstoqueState {
  filtros:     EstoqueFiltros
  drillChapa:  EstoqueDrillState
  drillBloco:  EstoqueDrillState
  drillFat:    EstoqueDrillState

  setFiltros:      (partial: Partial<EstoqueFiltros>) => void
  resetFiltros:    () => void

  // Drill-down genérico por tabela
  drillIntoChapa:  (node: EstoqueDrillNode) => void
  drillOutChapa:   (nivel: number) => void
  resetDrillChapa: () => void

  drillIntoBloco:  (node: EstoqueDrillNode) => void
  drillOutBloco:   (nivel: number) => void
  resetDrillBloco: () => void

  drillIntoFat:    (node: EstoqueDrillNode) => void
  drillOutFat:     (nivel: number) => void
  resetDrillFat:   () => void
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
}

function drillInto(state: EstoqueDrillState, node: EstoqueDrillNode): EstoqueDrillState {
  const path = [...state.path.slice(0, node.nivel), node]
  return { nivel: node.nivel + 1, path }
}

function drillOut(state: EstoqueDrillState, nivel: number): EstoqueDrillState {
  return { nivel, path: state.path.slice(0, nivel) }
}

export const useEstoqueStore = create<EstoqueState>()(
  devtools(
    (set) => ({
      filtros:    DEFAULT_ESTOQUE_FILTROS,
      drillChapa: DEFAULT_DRILL,
      drillBloco: DEFAULT_DRILL,
      drillFat:   DEFAULT_DRILL,

      setFiltros: (partial) =>
        set((s) => ({ filtros: { ...s.filtros, ...partial } }), false, 'setFiltros'),

      resetFiltros: () =>
        set({
          filtros:    DEFAULT_ESTOQUE_FILTROS,
          drillChapa: DEFAULT_DRILL,
          drillBloco: DEFAULT_DRILL,
          drillFat:   DEFAULT_DRILL,
        }, false, 'resetFiltros'),

      drillIntoChapa: (node) =>
        set((s) => ({ drillChapa: drillInto(s.drillChapa, node) }), false, 'drillIntoChapa'),
      drillOutChapa: (nivel) =>
        set((s) => ({ drillChapa: drillOut(s.drillChapa, nivel) }), false, 'drillOutChapa'),
      resetDrillChapa: () =>
        set({ drillChapa: DEFAULT_DRILL }, false, 'resetDrillChapa'),

      drillIntoBloco: (node) =>
        set((s) => ({ drillBloco: drillInto(s.drillBloco, node) }), false, 'drillIntoBloco'),
      drillOutBloco: (nivel) =>
        set((s) => ({ drillBloco: drillOut(s.drillBloco, nivel) }), false, 'drillOutBloco'),
      resetDrillBloco: () =>
        set({ drillBloco: DEFAULT_DRILL }, false, 'resetDrillBloco'),

      drillIntoFat: (node) =>
        set((s) => ({ drillFat: drillInto(s.drillFat, node) }), false, 'drillIntoFat'),
      drillOutFat: (nivel) =>
        set((s) => ({ drillFat: drillOut(s.drillFat, nivel) }), false, 'drillOutFat'),
      resetDrillFat: () =>
        set({ drillFat: DEFAULT_DRILL }, false, 'resetDrillFat'),
    }),
    { name: 'EstoqueDashboard' },
  ),
)

export const useEstoqueFiltros = () => useEstoqueStore((s) => s.filtros)
