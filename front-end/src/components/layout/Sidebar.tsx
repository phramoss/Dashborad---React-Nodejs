import { memo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart2, Layers, Settings, LogOut, X,
  TrendingUp, Calculator, FileText, Sun, Moon, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useThemeStore } from '@/store/theme.store'
import { useSidebarStore } from '@/store/sidebar.store'
import { cn } from '@/lib/utils'
import logoRedsis from '@/assets/logo-redsis.png'

const NAV_ITEMS = [
  { to: '/visao-geral',   icon: BarChart2,  label: 'Visão Geral'      },
  { to: '/estoque',       icon: Layers,     label: 'Estoque'          },
  { to: '/buraco-vendas', icon: TrendingUp, label: 'Buraco de Vendas' },
  { to: '/simulador',     icon: Calculator, label: 'Simulador'        },
  { to: '/dre',           icon: FileText,   label: 'D.R.E.'           },
] as const

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export const Sidebar = memo(function Sidebar({ open = false, onClose }: SidebarProps) {
  const { theme, toggle: toggleTheme } = useThemeStore()
  const { collapsed, toggle: toggleCollapsed } = useSidebarStore()

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col py-4',
          'bg-[var(--filter-bg)] border-r border-[var(--border)] shrink-0',
          'transition-all duration-200',
          'md:relative md:translate-x-0',
          collapsed ? 'w-14' : 'w-44',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Logo + botão colapso */}
        <div className={cn('flex items-center mb-5 shrink-0', collapsed ? 'justify-center px-3' : 'gap-2.5 px-4')}>
          {!collapsed && (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <img src={logoRedsis} alt="Redsis" className="w-full h-full object-contain" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onClose}
              className="ml-auto w-5 h-5 rounded-full bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center text-text-muted hover:text-text-primary md:hidden flex-shrink-0"
            >
              <X size={10} />
            </button>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'hidden md:flex items-center justify-center rounded-lg w-7 h-7',
              'text-white/50 hover:text-white hover:bg-white/10 transition-all',
              !collapsed && 'ml-auto',
            )}
          >
            {collapsed
              ? <PanelLeftOpen  size={15} strokeWidth={1.5} />
              : <PanelLeftClose size={15} strokeWidth={1.5} />
            }
          </button>
        </div>

        {/* Label seção */}
        {!collapsed && (
          <div className="px-3 mb-1 shrink-0">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.15em] px-1 mb-1">
              Navegação
            </p>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 px-2 shrink-0">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center h-9 rounded-xl',
                  'transition-all duration-150 text-[12px] font-medium',
                  collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white/80 rounded-r-full" />
                  )}
                  <Icon size={15} strokeWidth={isActive ? 2 : 1.5} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col gap-0.5 px-2 mt-auto shrink-0 pt-2">
          <button
            onClick={toggleTheme}
            title={collapsed ? (theme === 'dark' ? 'Tema Claro' : 'Tema Escuro') : undefined}
            className={cn(
              'flex items-center h-9 rounded-xl text-[12px] font-medium',
              'text-white/60 hover:text-white hover:bg-white/10 transition-all',
              collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
            )}
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
            {!collapsed && <span>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>}
          </button>

          <button
            title={collapsed ? 'Configurações' : undefined}
            className={cn(
              'flex items-center h-9 rounded-xl text-[12px] font-medium',
              'text-white/60 hover:text-white hover:bg-white/10 transition-all',
              collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
            )}
          >
            <Settings size={15} strokeWidth={1.5} />
            {!collapsed && <span>Configurações</span>}
          </button>

          <button
            title={collapsed ? 'Sair' : undefined}
            className={cn(
              'flex items-center h-9 rounded-xl text-[12px] font-medium',
              'text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all',
              collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
            )}
          >
            <LogOut size={15} strokeWidth={1.5} />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
})
