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

  // Toggle UF (mapa click-filter)
  toggleUf: (uf: string) => void

  // Toggle Município (mapa click-filter)
  toggleMunicipio: (municipio: string) => void

  // Set batch
  setClientes: (ids: number[]) => void
  setVendedores: (ids: number[]) => void
  setMateriais: (ids: number[]) => void
  setGrupos: (ids: number[]) => void
  setUfs: (ufs: string[]) => void
  setMunicipios: (municipios: string[]) => void

  // Toggle UF+Município juntos (mapa click-filter)
  toggleMapaLocal: (uf: string, municipio: string) => void
  clearMapaFilter: () => void

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
  materiais: [], grupos: [], ufs: [], municipios: [], granularidade: 'ano',
}

const DEFAULT_HOVER: HoverState = { dimension: null, id: null }
const DEFAULT_DRILL: DrillState = { active: false, mode: 'none', ano: null, label: null }

function countActive(f: FiltroDashboard, drill: DrillState): number {
  const anos  = drill.active ? 0 : f.anos.length
  const meses = drill.active ? 0 : f.meses.length
  return anos + meses + f.clientes.length + f.vendedores.length + f.materiais.length + f.grupos.length + f.ufs.length + f.municipios.length
}

function toggle(arr: number[], id: number): number[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
}

function toggleStr(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
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

      toggleUf: (uf) =>
        set((s) => {
          const filtros = { ...s.filtros, ufs: toggleStr(s.filtros.ufs, uf) }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'toggleUf'),

      toggleMunicipio: (municipio) =>
        set((s) => {
          const filtros = { ...s.filtros, municipios: toggleStr(s.filtros.municipios, municipio) }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'toggleMunicipio'),

      // Toggle UF + Município juntos ao clicar no mapa
      toggleMapaLocal: (uf, municipio) =>
        set((s) => {
          const key = `${municipio}|${uf}`
          // Checa se esse par já está selecionado
          const hasMun = s.filtros.municipios.includes(municipio)
          const hasUf  = s.filtros.ufs.includes(uf)

          let newMunicipios: string[]
          let newUfs: string[]

          if (hasMun) {
            // Remove município
            newMunicipios = s.filtros.municipios.filter(m => m !== municipio)
            // Remove UF se não há mais nenhum município daquela UF selecionado
            const otherMunsOfUf = newMunicipios.length > 0 // simplificado: mantém UF se há outros municípios
            newUfs = otherMunsOfUf ? s.filtros.ufs : s.filtros.ufs.filter(u => u !== uf)
          } else {
            // Adiciona município e UF
            newMunicipios = [...s.filtros.municipios, municipio]
            newUfs = hasUf ? s.filtros.ufs : [...s.filtros.ufs, uf]
          }

          const filtros = { ...s.filtros, ufs: newUfs, municipios: newMunicipios }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'toggleMapaLocal'),

      clearMapaFilter: () =>
        set((s) => {
          const filtros = { ...s.filtros, ufs: [], municipios: [] }
          return { filtros, activeCount: countActive(filtros, s.drill) }
        }, false, 'clearMapaFilter'),

      setClientes: (clientes) =>
        set((s) => { const filtros = { ...s.filtros, clientes }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setClientes'),

      setVendedores: (vendedores) =>
        set((s) => { const filtros = { ...s.filtros, vendedores }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setVendedores'),

      setMateriais: (materiais) =>
        set((s) => { const filtros = { ...s.filtros, materiais }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setMateriais'),

      setGrupos: (grupos) =>
        set((s) => { const filtros = { ...s.filtros, grupos }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setGrupos'),

      setUfs: (ufs) =>
        set((s) => { const filtros = { ...s.filtros, ufs }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setUfs'),

      setMunicipios: (municipios) =>
        set((s) => { const filtros = { ...s.filtros, municipios }; return { filtros, activeCount: countActive(filtros, s.drill) } }, false, 'setMunicipios'),

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

// ─── PERFORMANCE: seletores por dimensão ──────────────────────
// Evitam re-render de um chart quando muda filtro de OUTRA dimensão.
// Ex: TopClientesChart só re-renderiza quando filtros.clientes muda,
//     não quando hover, drill, vendedores etc. mudam.
export const useFilteredAnos       = () => useFiltrosStore((s) => s.filtros.anos)
export const useFilteredMeses      = () => useFiltrosStore((s) => s.filtros.meses)
export const useFilteredClientes   = () => useFiltrosStore((s) => s.filtros.clientes)
export const useFilteredVendedores = () => useFiltrosStore((s) => s.filtros.vendedores)
export const useFilteredMateriais  = () => useFiltrosStore((s) => s.filtros.materiais)
export const useFilteredGrupos     = () => useFiltrosStore((s) => s.filtros.grupos)
export const useFilteredUfs        = () => useFiltrosStore((s) => s.filtros.ufs)
export const useFilteredMunicipios = () => useFiltrosStore((s) => s.filtros.municipios)