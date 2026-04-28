import { useIsFetching } from '@tanstack/react-query'

export function useGlobalLoading(): boolean {
  const fetching = useIsFetching({ queryKey: ['dashboard'] })
  return fetching > 0
}
