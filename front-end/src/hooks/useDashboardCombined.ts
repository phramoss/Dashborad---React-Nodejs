/**
 * useDashboardCombined.ts
 *
 * PERFORMANCE: Hook que busca todos os dados do dashboard em 1 request HTTP
 * via /analytics/dashboard. Os hooks individuais (useKpiSummary, etc.)
 * continuam funcionando como fallback — este hook popula o cache do
 * React Query para cada query key individualmente.
 *
 * COMO FUNCIONA:
 * 1. Faz 1 request para /analytics/dashboard
 * 2. Com o resultado, seta o cache do React Query para cada query key
 * 3. Os hooks individuais (useKpiSummary, etc.) encontram dados no cache
 *    e NÃO fazem request próprio (staleTime impede refetch)
 *
 * RESULTADO: 1 HTTP request em vez de 7+ no carregamento inicial.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useDebouncedFiltros } from './useDebouncedFiltros'
import { fetchDashboardCombined, type DashboardCombinedData } from '@/services/dashboard-combined.service'
import { qk } from './useDashboardData'

export function useDashboardCombined() {
  const f = useDebouncedFiltros()
  const queryClient = useQueryClient()

  const result = useQuery({
    queryKey: ['dashboard-combined', f.anos, f.meses, f.clientes, f.vendedores, f.materiais, f.grupos],
    queryFn: () => fetchDashboardCombined(f),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  // Quando os dados chegam, popula o cache individual de cada hook
  useEffect(() => {
    if (!result.data) return
    const data: DashboardCombinedData = result.data

    // Popula cache do KPI
    queryClient.setQueryData(qk.kpi(f), data.kpi)

    // Popula cache do por-ano (período)
    queryClient.setQueryData(qk.periodo(f), data.porAno)

    // Popula cache do top-clientes
    queryClient.setQueryData([...qk.clientes(f), undefined], data.topClientes)

    // Popula cache do top-materiais
    queryClient.setQueryData([...qk.materiais(f), undefined], data.topMateriais)

    // Popula cache do top-vendedores
    queryClient.setQueryData(qk.vendedores(f), data.topVendedores)

    // Popula cache do por-grupo
    queryClient.setQueryData(qk.grupos(f), data.porGrupo)
  }, [result.data, f, queryClient])

  return result
}
