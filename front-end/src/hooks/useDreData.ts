import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useDreFiltros } from '@/store/dre.store'
import { fetchDre, fetchDreFiltros } from '@/services/dre.service'

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

export function useDreData() {
  const f = useDreFiltros()
  return useQuery({
    ...BASE,
    queryKey: ['dre', f.modo, f.data_ini, f.data_fim],
    queryFn:  () => fetchDre(f),
  })
}

export function useDreFiltrosDisponiveis() {
  return useQuery({
    queryKey:             ['dre-filtros-disponiveis'],
    queryFn:              fetchDreFiltros,
    staleTime:            1000 * 60 * 60,
    gcTime:               1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
  })
}
