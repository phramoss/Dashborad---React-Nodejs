import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useFinanceiroFiltros } from '@/store/financeiro.store'
import {
  fetchFinanceiroKpi, fetchAReceber, fetchAPagar,
  fetchMovimentoSemanal, fetchSaldoBancario, fetchFluxoCaixa,
  fetchFinanceiroFiltros,
} from '@/services/financeiro.service'

const BASE = {
  staleTime:            1000 * 30,
  gcTime:               1000 * 60 * 5,
  refetchOnWindowFocus: false,
  placeholderData:      keepPreviousData,
  retry: (count: number, err: unknown) => {
    const status = (err as { response?: { status: number } })?.response?.status
    if (status && status >= 400 && status < 500) return false
    return count < 1
  },
}

export function useFinanceiroKpi() {
  const f = useFinanceiroFiltros()
  return useQuery({ ...BASE, queryKey: ['fin-kpi', f], queryFn: () => fetchFinanceiroKpi(f) })
}

export function useAReceber(agrupar: string) {
  const f = useFinanceiroFiltros()
  return useQuery({ ...BASE, queryKey: ['fin-receber', f, agrupar], queryFn: () => fetchAReceber(f, agrupar) })
}

export function useAPagar(agrupar: string) {
  const f = useFinanceiroFiltros()
  return useQuery({ ...BASE, queryKey: ['fin-pagar', f, agrupar], queryFn: () => fetchAPagar(f, agrupar) })
}

export function useMovimentoSemanal() {
  const f = useFinanceiroFiltros()
  return useQuery({ ...BASE, queryKey: ['fin-semanal', f], queryFn: () => fetchMovimentoSemanal(f) })
}

export function useSaldoBancario() {
  return useQuery({ ...BASE, staleTime: 1000 * 60, queryKey: ['fin-saldo'], queryFn: fetchSaldoBancario })
}

export function useFluxoCaixa() {
  const f = useFinanceiroFiltros()
  return useQuery({ ...BASE, queryKey: ['fin-fluxo', f], queryFn: () => fetchFluxoCaixa(f) })
}

export function useFinanceiroFiltrosDisponiveis() {
  return useQuery({
    queryKey: ['fin-filtros'],
    queryFn:  fetchFinanceiroFiltros,
    staleTime: 1000 * 60 * 60,
    gcTime:    1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
  })
}
