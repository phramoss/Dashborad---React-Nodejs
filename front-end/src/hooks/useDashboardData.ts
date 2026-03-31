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
} from '@/services/dashboard.service'

const BASE = {
  staleTime: 1000 * 30,
  gcTime: 1000 * 60 * 5,
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

  // ✅ meses incluído na key — invalida cache ao filtrar mês
  drillMes: (f: ReturnType<typeof useDebouncedFiltros>, ano: number) =>
    ['drill-mes', f.anos, f.meses, f.clientes, f.vendedores, f.materiais, f.grupos, ano] as const,

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
  return useQuery({
    ...BASE,
    queryKey: qk.drillMes(f, ano ?? 0),
    queryFn: () => ano ? fetchFaturamentoPorMes(f, ano) : Promise.resolve([]),
    enabled: ano !== null,
  })
}

export function useFaturamentoCliente() {
  const f = useDebouncedFiltros()
  return useQuery({ ...BASE, queryKey: qk.clientes(f), queryFn: () => fetchTopClientes(f, 10) })
}

export function useFaturamentoMaterial() {
  const f = useDebouncedFiltros()
  return useQuery({ ...BASE, queryKey: qk.materiais(f), queryFn: () => fetchTopMateriais(f, 10) })
}

export function useFaturamentoGrupo() {
  const f = useDebouncedFiltros()
  return useQuery({ ...BASE, queryKey: qk.grupos(f), queryFn: () => fetchPorGrupo(f) })
}

export function useFaturamentoVendedor() {
  const f = useDebouncedFiltros()
  return useQuery({ ...BASE, queryKey: qk.vendedores(f), queryFn: () => fetchTopVendedores(f, 20) })
}