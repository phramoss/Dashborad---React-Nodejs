import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './index.css'

// ─── QueryClient configurado para produção ────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { response?: { status: number } })?.response?.status
        // Não faz retry em erros de cliente (400-499)
        if (status && status >= 400 && status < 500) return false
        return failureCount < 2
      },
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,  // Refetch quando volta a internet
    },
    mutations: {
      retry: 1,
    },
  },
})

// ─── Global query error handler ───────────────────────────────
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.query.state.status === 'error') {
    const error = event.query.state.error as { response?: { status: number }; message?: string }
    // Em produção: enviar para Sentry aqui
    if (import.meta.env.DEV) {
      console.error('[Query Error]', event.query.queryKey, error?.message)
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  </React.StrictMode>,
)
