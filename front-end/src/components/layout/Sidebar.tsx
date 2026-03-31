import { NavLink } from 'react-router-dom'
import { BarChart2, TrendingUp, Users, Package, Settings, LogOut } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/visao-geral', icon: BarChart2,  label: 'Visão Geral'  },
  { to: '/tendencias',  icon: TrendingUp, label: 'Tendências'   },
  { to: '/clientes',    icon: Users,      label: 'Clientes'      },
  { to: '/produtos',    icon: Package,    label: 'Produtos'      },
] as const

export function Sidebar() {
  return (
    <aside className="w-14 flex flex-col items-center py-4 gap-2 bg-surface border-r border-surface-border shrink-0">
      {/* Logo */}
      <Tooltip content="Dashboard Comercial" side="right">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center mb-4 shrink-0 shadow-glow cursor-default">
          <span className="text-surface-dark font-display font-bold text-sm select-none">R</span>
        </div>
      </Tooltip>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <Tooltip key={to} content={label} side="right">
            <NavLink
              to={to}
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
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand rounded-r-full" />
                  )}
                </>
              )}
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      {/* Bottom */}
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
  )
}
