import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Erro ao carregar dados', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-2 text-status-danger/70">
      <AlertTriangle size={28} strokeWidth={1} />
      <p className="text-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-brand hover:underline mt-1"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
