import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Em produção, enviar para Sentry/Datadog aqui
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 rounded-xl bg-surface border border-status-danger/20 p-6">
          <AlertTriangle size={32} className="text-status-danger/60" strokeWidth={1} />
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary mb-1">Algo deu errado</p>
            <p className="text-xs text-text-muted max-w-xs">
              {this.state.error?.message ?? 'Erro inesperado no componente'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface-light text-text-secondary hover:text-text-primary border border-surface-border hover:border-brand/30 transition-all"
          >
            <RefreshCw size={11} />
            Tentar novamente
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
