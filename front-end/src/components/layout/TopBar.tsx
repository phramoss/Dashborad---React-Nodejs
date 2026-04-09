import { useLocation } from 'react-router-dom'
import { Bell, RefreshCw, Menu } from 'lucide-react'
import { useActiveCount, useResetFiltros } from '@/store/filtros.store'
import { useGlobalLoading } from '@/hooks/useGlobalLoading'
// import { useUltimaAtualizacao } from '@/hooks/useDashboardData'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, { title: string; desc: string }> = {
  '/visao-geral':   { title: 'Visão Geral',      desc: 'Análise Comercial'        },
  '/estoque':       { title: 'Estoque',          desc: 'Disponíveis e Reservados' },
  '/buraco-vendas': { title: 'Buraco de Vendas', desc: 'Análise de desempenho'    },
}

// function UltimaAtualizacao() {
//   const { data: ultimaData } = useUltimaAtualizacao()

//   const formatted = ultimaData
//     ? new Date(ultimaData).toLocaleString('pt-BR', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//       })
//     : new Date().toLocaleDateString('pt-BR', {
//         weekday: 'short',
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//       })

//   return (
//     <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-text-muted">
//       <Calendar size={11} />
//       <span className="capitalize">
//         {ultimaData ? `Atualizado: ${formatted}` : formatted}
//       </span>
//     </div>
//   )
// }

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const location    = useLocation()
  const activeCount = useActiveCount()
  const resetFiltros = useResetFiltros()
  const isLoading   = useGlobalLoading()
  const page        = PAGE_TITLES[location.pathname]

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-surface-border bg-surface">
      {/* Left: hamburguer (mobile) + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all md:hidden"
        >
          <Menu size={16} strokeWidth={1.5} />
        </button>

        <div className="flex flex-col justify-center leading-none">
          <span className="text-base sm:text-2x1 font-semibold font-display tracking-wide text-text-primary uppercase">
            {page?.title ?? 'Dashboard'}  - {page?.desc}
          </span>
        </div>

        {activeCount > 0 && (
          <button
            onClick={resetFiltros}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium',
              'bg-brand/10 text-brand border border-brand/20',
              'hover:bg-brand/20 transition-colors group',
            )}
          >
            <RefreshCw
              size={10}
              className={cn('transition-transform', isLoading && 'animate-spin')}
            />
            {activeCount} filtro{activeCount > 1 ? 's' : ''}
            <span className="text-brand/50 group-hover:text-brand/80 transition-colors">× limpar</span>
          </button>
        )}

        {isLoading && activeCount === 0 && (
          <RefreshCw size={12} className="text-text-muted animate-spin" />
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* <UltimaAtualizacao /> */}

        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all relative">
          <Bell size={14} strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-status-danger rounded-full" />
        </button>

        <button className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-chart-blue border border-brand/30 flex items-center justify-center transition-transform hover:scale-105">
          <span className="text-surface-dark font-bold text-[10px]">U</span>
        </button>
      </div>
    </header>
  )
}
