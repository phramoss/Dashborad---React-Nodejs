import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'

interface HealthResponse {
  ok: boolean
  status?: string
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: async (): Promise<HealthResponse> => {
      const res = await apiClient.get<HealthResponse>('/health')
      return res.data
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
