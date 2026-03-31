import { useApiHealth } from '@/hooks/useApiHealth'
import { cn } from '@/lib/utils'

export function ApiStatusBadge() {
  const { data, isError, isPending } = useApiHealth()

  if (isPending) return null

  const isOk = !isError && data?.status === 'ok'
  const isMock = import.meta.env.VITE_USE_MOCK !== 'false'

  return (
    <div
      className={cn(
        'fixed bottom-3 right-3 z-50',
        'flex items-center gap-1.5 px-2 py-1 rounded-full',
        'text-[10px] font-medium border',
        'bg-surface/80 backdrop-blur-sm',
        isOk
          ? 'text-status-success border-status-success/20'
          : 'text-status-danger border-status-danger/20',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          isOk ? 'bg-status-success animate-pulse' : 'bg-status-danger',
        )}
      />
      {isMock ? 'Mock Data' : isOk ? 'API Online' : 'API Offline'}
    </div>
  )
}
