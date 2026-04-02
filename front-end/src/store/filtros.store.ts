import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type { FiltroDashboard, GranularidadePeriodo } from '@/types'

// ─── Highlight state: qual item está em hover em QUALQUER gráfico
export interface HoverState {
  dimension: 'cliente' | 'material' | 'grupo' | 'vendedor' | 'periodo' | null
  id: number | string | null
}

// ─── Drill-down state
// mode:
//   'none'      → visão de anos (padrão)
//   'drill'     → usuário clicou num ano → vê meses daquele ano
//   'expandAll' → ▶ Expandir por nível: todos os anos exibidos em meses lado a lado
export type DrillMode = 'none' | 'drill' | 'expandAll'

export interface DrillState {
  active: boolean       // true quando mode !== 'none'
  mode: DrillMode
  ano: number | null    // preenchido só em mode === 'drill'
  label: string | null
}

interface FiltrosState {
  filtros: FiltroDashboard
  activeCount: number
  hover: HoverState
  drill: DrillState

  // Granularidade
  setGranularidade: (g: GranularidadePeriodo) => void

  // Toggle individual
  toggleAno: (ano: number) => void
  toggleMes: (mes: number) => void   // multi-seleção acumulativa (com dimming)
  toggleCliente: (id: number) => void
  toggleVendedor: (id: number) => void
  toggleMaterial: (id: number) => void
  toggleGrupo: (id: number) => void

  // Set batch
  setClientes: (ids: number[]) => void
  setVendedores: (ids: number[]) => void
  setMateriais: (ids: number[]) => void
  setGrupos: (ids: number[]) => void

  // Hover cross-highlight
  setHover: (hover: HoverState) => void
  clearHover: () => void

  // Drill-down (Power BI style)
  drillInto: (ano: number, label: string) => void   // ⬇ Ir para próximo nível (1 ano)
  drillOut: () => void                               // ⟲ Subir um nível
  expandAll: () => void                              // ▶ Expandir por nível (todos os anos em meses)

  // Reset
  resetFiltros: () => void
  resetFiltro: (key: keyof Omit<FiltroDashboard, 'granularidade'>) => void
}

const DEFAULT_FILTROS: FiltroDashboard = {
  anos: [], meses: [], clientes: [], vendedores: [],
  materiais: [], grupos: [], granularidade: 'ano',
}

const DEFAULT_HOVER: HoverState = { dimension: null, id: null }
const DEFAULT_DRILL: DrillState = { active: false, mode: 'none', ano: null, label: null }

function countActive(f: FiltroDashboard, drill: DrillState): number {
  const anos  = drill.active ? 0 : f.anos.length
  const meses = drill.active ? 0 : f.meses.length
  return anos + meses + f.clientes.length + f.vendedores.length + f.materiais.length + f.grupos.length
}

function toggle(arr: number[], id: number): number[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
}

export const useFiltrosStore = create<FiltrosState>()(
  devtools(
    subscribeWithSelector((set) => ({
      filtros: DEFAULT_FILTROS,
      activeCount: 0,
      hover: DEFAULT_HOVER,
      drill: DEFAULT_DRILL,

      setGranularidade: (granularidade) =>
        set((s) => ({ filtros: { ...s.filtros, granularidade } }), false, 'setGranularidade'),

      toggleAno: (ano) =>
        set((s) => {
          const filtros = { ...s.filtros, anos: toggle(s.filtros.anos, ano) }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'toggleAno'),

      // Multi-seleção acumulativa: cada clique adiciona/remove um mês → dimming no gráfico + filtra na API
      toggleMes: (mes) =>
        set((s) => {
          const filtros = { ...s.filtros, meses: toggle(s.filtros.meses, mes) }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'toggleMes'),

      toggleCliente: (id) =>
        set((s) => {
          const filtros = { ...s.filtros, clientes: toggle(s.filtros.clientes, id) }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'toggleCliente'),

      toggleVendedor: (id) =>
        set((s) => {
          const filtros = { ...s.filtros, vendedores: toggle(s.filtros.vendedores, id) }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'toggleVendedor'),

      toggleMaterial: (id) =>
        set((s) => {
          const filtros = { ...s.filtros, materiais: toggle(s.filtros.materiais, id) }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'toggleMaterial'),

      toggleGrupo: (id) =>
        set((s) => {
          const filtros = { ...s.filtros, grupos: toggle(s.filtros.grupos, id) }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'toggleGrupo'),

      setClientes: (clientes) =>
        set((s) => { const filtros = { ...s.filtros, clientes }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setClientes'),

      setVendedores: (vendedores) =>
        set((s) => { const filtros = { ...s.filtros, vendedores }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setVendedores'),

      setMateriais: (materiais) =>
        set((s) => { const filtros = { ...s.filtros, materiais }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setMateriais'),

      setGrupos: (grupos) =>
        set((s) => { const filtros = { ...s.filtros, grupos }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setGrupos'),

      setHover: (hover) => set({ hover }, false, 'setHover'),
      clearHover: () => set({ hover: DEFAULT_HOVER }, false, 'clearHover'),

      // ⬇ Ir para o próximo nível: entra nos meses de 1 ano específico
      drillInto: (ano, label) =>
        set((s) => {
          const drill: DrillState = { active: true, mode: 'drill', ano, label }
          const filtros = { ...s.filtros, anos: [ano], meses: [], granularidade: 'mes' as GranularidadePeriodo }
          return { drill, filtros, activeCount: countActive(filtros, drill) }
        }, false, 'drillInto'),

      // ⟲ Subir um nível: volta para visão de anos
      drillOut: () =>
        set((s) => {
          const drill = DEFAULT_DRILL
          const filtros = { ...s.filtros, anos: [], meses: [], granularidade: 'ano' as GranularidadePeriodo }
          return { drill, filtros, activeCount: countActive(filtros, drill) }
        }, false, 'drillOut'),

      // ▶ Expandir por nível: mostra todos os anos selecionados (ou todos) em meses agrupados
      expandAll: () =>
        set((s) => {
          const drill: DrillState = { active: true, mode: 'expandAll', ano: null, label: null }
          // Mantém anos selecionados (ou todos); limpa meses; muda granularidade para mês
          const filtros = { ...s.filtros, meses: [], granularidade: 'mes' as GranularidadePeriodo }
          return { drill, filtros, activeCount: countActive(filtros, drill) }
        }, false, 'expandAll'),

      resetFiltro: (key) =>
        set((s) => {
          const filtros = { ...s.filtros, [key]: [] }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'resetFiltro'),

      resetFiltros: () =>
        set({ filtros: DEFAULT_FILTROS, activeCount: 0, drill: DEFAULT_DRILL }, false, 'resetFiltros'),
    })),
    { name: 'FiltrosDashboard' },
  ),
)

// ─── Selector hooks granulares ────────────────────────────────
export const useFiltros      = () => useFiltrosStore((s) => s.filtros)
export const useActiveCount  = () => useFiltrosStore((s) => s.activeCount)
export const useResetFiltros = () => useFiltrosStore((s) => s.resetFiltros)
export const useHover        = () => useFiltrosStore((s) => s.hover)
export const useDrill        = () => useFiltrosStore((s) => s.drill)