import { useQuery } from '@tanstack/react-query'
import { fetchFiltrosDisponiveis } from '@/services/filtros.service'

export function useFiltrosDisponiveis() {
  return useQuery({
    queryKey: ['filtros-disponiveis'],
    queryFn: () => fetchFiltrosDisponiveis(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  })
}
