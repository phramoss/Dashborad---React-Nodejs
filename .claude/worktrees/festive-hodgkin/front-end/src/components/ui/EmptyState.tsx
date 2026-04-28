import { BarChart2 } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  icon?: React.ReactNode
}

export function EmptyState({ message = 'Nenhum dado encontrado', icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-2 text-text-muted">
      {icon ?? <BarChart2 size={28} strokeWidth={1} />}
      <p className="text-xs">{message}</p>
    </div>
  )
}
