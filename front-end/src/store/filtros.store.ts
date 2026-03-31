import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type { FiltroDashboard, GranularidadePeriodo } from '@/types'

// ─── Highlight state: qual item está em hover em QUALQUER gráfico
export interface HoverState {
  dimension: 'cliente' | 'material' | 'grupo' | 'vendedor' | 'periodo' | null
  id: number | string | null
}

// ─── Drill-down state: usuário clicou em ano → entra em meses
export interface DrillState {
  active: boolean
  ano: number | null
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
  toggleMes: (mes: number) => void
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

  // Drill-down
  drillInto: (ano: number, label: string) => void
  drillOut: () => void

  // Reset
  resetFiltros: () => void
  resetFiltro: (key: keyof Omit<FiltroDashboard, 'granularidade'>) => void
}

const DEFAULT_FILTROS: FiltroDashboard = {
  anos: [], meses: [], clientes: [], vendedores: [],
  materiais: [], grupos: [], granularidade: 'ano',
}

const DEFAULT_HOVER: HoverState = { dimension: null, id: null }
const DEFAULT_DRILL: DrillState = { active: false, ano: null, label: null }

function countActive(f: FiltroDashboard): number {
  return f.anos.length + f.meses.length + f.clientes.length +
    f.vendedores.length + f.materiais.length + f.grupos.length
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
          return { filtros, activeCount: countActive(filtros) }
        }, false, 'toggleAno'),

      toggleMes: (mes) =>
        set((s) => {
          const filtros = { ...s.filtros, meses: toggle(s.filtros.meses, mes) }
          return { filtros, activeCount: countActive(filtros) }
        }, false, 'toggleMes'),

      toggleCliente: (id) =>
        set((s) => {
          const filtros = { ...s.filtros, clientes: toggle(s.filtros.clientes, id) }
          return { filtros, activeCount: countActive(filtros) }
        }, false, 'toggleCliente'),

      toggleVendedor: (id) =>
        set((s) => {
          const filtros = { ...s.filtros, vendedores: toggle(s.filtros.vendedores, id) }
          return { filtros, activeCount: countActive(filtros) }
        }, false, 'toggleVendedor'),

      toggleMaterial: (id) =>
        set((s) => {
          const filtros = { ...s.filtros, materiais: toggle(s.filtros.materiais, id) }
          return { filtros, activeCount: countActive(filtros) }
        }, false, 'toggleMaterial'),

      toggleGrupo: (id) =>
        set((s) => {
          const filtros = { ...s.filtros, grupos: toggle(s.filtros.grupos, id) }
          return { filtros, activeCount: countActive(filtros) }
        }, false, 'toggleGrupo'),

      setClientes: (clientes) =>
        set((s) => { const filtros = { ...s.filtros, clientes }; return { filtros, activeCount: countActive(filtros) } }, false, 'setClientes'),

      setVendedores: (vendedores) =>
        set((s) => { const filtros = { ...s.filtros, vendedores }; return { filtros, activeCount: countActive(filtros) } }, false, 'setVendedores'),

      setMateriais: (materiais) =>
        set((s) => { const filtros = { ...s.filtros, materiais }; return { filtros, activeCount: countActive(filtros) } }, false, 'setMateriais'),

      setGrupos: (grupos) =>
        set((s) => { const filtros = { ...s.filtros, grupos }; return { filtros, activeCount: countActive(filtros) } }, false, 'setGrupos'),

      setHover: (hover) => set({ hover }, false, 'setHover'),
      clearHover: () => set({ hover: DEFAULT_HOVER }, false, 'clearHover'),

      drillInto: (ano, label) =>
        set((s) => ({
          drill: { active: true, ano, label },
          // Ao fazer drill, seta o ano, limpa meses e muda granularidade para mês
          filtros: { ...s.filtros, anos: [ano], meses: [], granularidade: 'mes' },
          activeCount: countActive({ ...s.filtros, anos: [ano], meses: [] }),
        }), false, 'drillInto'),

      drillOut: () =>
        set((s) => ({
          drill: DEFAULT_DRILL,
          // Ao voltar, limpa ano e meses selecionados
          filtros: { ...s.filtros, anos: [], meses: [], granularidade: 'ano' },
          activeCount: countActive({ ...s.filtros, anos: [], meses: [] }),
        }), false, 'drillOut'),

      resetFiltro: (key) =>
        set((s) => {
          const filtros = { ...s.filtros, [key]: [] }
          return { filtros, activeCount: countActive(filtros) }
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
