import { NavLink } from 'react-router-dom'
import { BarChart2, Layers, Settings, LogOut, X, TrendingUp, Calculator, FileText } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import logoRedsis from '@/assets/logo-redsis.png'

const NAV_ITEMS = [
  { to: '/visao-geral',   icon: BarChart2,   label: 'Visão Geral'              },
  { to: '/estoque',       icon: Layers,      label: 'Estoque'                  },
  { to: '/buraco-vendas', icon: TrendingUp,  label: 'Buraco de Vendas'         },
  { to: '/simulador',     icon: Calculator,  label: 'Simulador - Análise de Vendas'  },
  { to: '/dre',           icon: FileText,    label: 'DRE - Caixa / Competência' },
] as const

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-14 flex flex-col items-center py-4 gap-2',
          'bg-surface border-r border-surface-border shrink-0',
          'transition-transform duration-200',
          'md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="relative w-8 h-8 mb-4 shrink-0">
          <Tooltip content="Dashboard Comercial" side="right">
            <div className="w-8 h-8 rounded-lg overflow-hidden cursor-default flex items-center justify-center">
              <img src={logoRedsis} alt="Redsis" className="w-full h-full object-contain" />
            </div>
          </Tooltip>
          <button
            onClick={onClose}
            className="absolute -right-3 -top-1 w-5 h-5 rounded-full bg-surface-light border border-surface-border flex items-center justify-center text-text-muted hover:text-text-primary md:hidden"
          >
            <X size={10} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <Tooltip key={to} content={label} side="right">
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'relative w-10 h-10 rounded-xl flex items-center justify-center',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-brand/15 text-brand shadow-glow'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-light',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} strokeWidth={isActive ? 2 : 1.5} />
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand rounded-r-full" />
                    )}
                  </>
                )}
              </NavLink>
            </Tooltip>
          ))}
        </nav>

        <div className="flex flex-col gap-1">
          <Tooltip content="Configurações" side="right">
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all">
              <Settings size={17} strokeWidth={1.5} />
            </button>
          </Tooltip>
          <Tooltip content="Sair" side="right">
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-all">
              <LogOut size={17} strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>
      </aside>
    </>
  )
}
