import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { FinanceiroFiltros } from '@/types'

interface FinanceiroState {
  filtros:      FinanceiroFiltros
  setMoeda:     (v: string[])  => void
  setEmpresa:   (v: number[])  => void
  setClientes:  (v: number[])  => void
  setVencIni:   (v: string)    => void
  setVencFim:   (v: string)    => void
  setEmisIni:   (v: string)    => void
  setEmisFim:   (v: string)    => void
  resetFiltros: () => void
}

const hoje = new Date()
const anoAtual = hoje.getFullYear()

const DEFAULT: FinanceiroFiltros = {
  moeda:    [],
  empresa:  [],
  clientes: [],
  venc_ini: `2022-01-01`,
  venc_fim: `${anoAtual + 2}-12-31`,
  emis_ini: `2013-01-01`,
  emis_fim: `${anoAtual}-12-31`,
}

export const useFinanceiroStore = create<FinanceiroState>()(
  devtools(
    (set) => ({
      filtros: DEFAULT,
      setMoeda:     (moeda)    => set(s => ({ filtros: { ...s.filtros, moeda    } }), false, 'setMoeda'),
      setEmpresa:   (empresa)  => set(s => ({ filtros: { ...s.filtros, empresa  } }), false, 'setEmpresa'),
      setClientes:  (clientes) => set(s => ({ filtros: { ...s.filtros, clientes } }), false, 'setClientes'),
      setVencIni:   (venc_ini) => set(s => ({ filtros: { ...s.filtros, venc_ini } }), false, 'setVencIni'),
      setVencFim:   (venc_fim) => set(s => ({ filtros: { ...s.filtros, venc_fim } }), false, 'setVencFim'),
      setEmisIni:   (emis_ini) => set(s => ({ filtros: { ...s.filtros, emis_ini } }), false, 'setEmisIni'),
      setEmisFim:   (emis_fim) => set(s => ({ filtros: { ...s.filtros, emis_fim } }), false, 'setEmisFim'),
      resetFiltros: ()         => set({ filtros: DEFAULT }, false, 'resetFiltros'),
    }),
    { name: 'FinanceiroDashboard' },
  ),
)

export const useFinanceiroFiltros = () => useFinanceiroStore(s => s.filtros)
