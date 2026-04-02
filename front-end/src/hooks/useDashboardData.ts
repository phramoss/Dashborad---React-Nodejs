import { useQuery } from '@tanstack/react-query'
import { useDebouncedFiltros } from './useDebouncedFiltros'
import {
  fetchKpiSummary,
  fetchFaturamentoPorAno,
  fetchFaturamentoPorMes,
  fetchTopClientes,
  fetchTopMateriais,
  fetchPorGrupo,
  fetchTopVendedores,
  fetchFaturamentoTodosMeses,
} from '@/services/dashboard.service'

const BASE = {
  staleTime: 1000 * 30,
  gcTime:    1000 * 60 * 5,
  refetchOnWindowFocus: false,
  placeholderData: (prev: unknown) => prev,
  retry: (count: number, err: unknown) => {
    const status = (err as { response?: { status: number } })?.response?.status
    if (status && status >= 400 && status < 500) return false
    return count < 2
  },
} as const

export const qk = {
  kpi: (f: ReturnType<typeof useDebouncedFiltros>) =>
    ['kpi', f.anos, f.meses, f.clientes, f.vendedores, f.materiais, f.grupos] as const,

  periodo: (f: ReturnType<typeof useDebouncedFiltros>) =>
    ['periodo', f.anos, f.meses, f.clientes, f.vendedores, f.materiais, f.grupos, f.granularidade] as const,

  // FIX: drillMes NÃO inclui f.meses — o gráfico sempre mostra todos os meses.
  // A seleção de meses é puramente visual (dimming) e não deve invalidar o cache.
  drillMes: (f: ReturnType<typeof useDebouncedFiltros>, ano: number) =>
    ['drill-mes', f.anos, f.clientes, f.vendedores, f.materiais, f.grupos, ano] as const,

  clientes: (f: ReturnType<typeof useDebouncedFiltros>) =>
    ['clientes', f.anos, f.meses, f.vendedores, f.materiais, f.grupos] as const,

  materiais: (f: ReturnType<typeof useDebouncedFiltros>) =>
    ['materiais', f.anos, f.meses, f.clientes, f.vendedores, f.grupos] as const,

  grupos: (f: ReturnType<typeof useDebouncedFiltros>) =>
    ['grupos', f.anos, f.meses, f.clientes, f.vendedores] as const,

  vendedores: (f: ReturnType<typeof useDebouncedFiltros>) =>
    ['vendedores', f.anos, f.meses, f.clientes, f.materiais, f.grupos] as const,
}

export function useKpiSummary() {
  const f = useDebouncedFiltros()
  return useQuery({ ...BASE, queryKey: qk.kpi(f), queryFn: () => fetchKpiSummary(f) })
}

export function useFaturamentoPeriodo() {
  const f = useDebouncedFiltros()
  return useQuery({ ...BASE, queryKey: qk.periodo(f), queryFn: () => fetchFaturamentoPorAno(f) })
}

export function useFaturamentoPorMes(ano: number | null) {
  const f = useDebouncedFiltros()
  // FIX: strip meses — o gráfico mensal sempre mostra TODOS os meses.
  // A seleção de meses afeta apenas o dimming visual e cross-filters de outros componentes.
  const fChart = { ...f, meses: [] as number[] }
  return useQuery({
    ...BASE,
    queryKey: qk.drillMes(fChart, ano ?? 0),
    queryFn:  () => (ano ? fetchFaturamentoPorMes(fChart, ano) : Promise.resolve([])),
    enabled:  ano !== null,
  })
}

export function useFaturamentoCliente(limit?: number) {
  const f = useDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: [...qk.clientes(f), limit],
    queryFn:  () => fetchTopClientes(f, limit),
  })
}

export function useFaturamentoMaterial(limit?: number) {
  const f = useDebouncedFiltros()
  return useQuery({ 
    ...BASE, 
    queryKey: [...qk.materiais(f), limit],
    queryFn: () => fetchTopMateriais(f, limit) 
  })
}

export function useFaturamentoGrupo() {
  const f = useDebouncedFiltros()
  return useQuery({ ...BASE, queryKey: qk.grupos(f), queryFn: () => fetchPorGrupo(f) })
}

export function useFaturamentoVendedor() {
  const f = useDebouncedFiltros()
  return useQuery({ ...BASE, queryKey: qk.vendedores(f), queryFn: () => fetchTopVendedores(f, 20) })
}
export function useFaturamentoTodosMeses(enabled: boolean) {
  const f = useDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: ['todos-meses', f.anos, f.clientes, f.vendedores, f.materiais, f.grupos],
    queryFn:  () => fetchFaturamentoTodosMeses(f),
    enabled,
  })
}