import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { GlobalLoadingBar } from '@/components/ui/GlobalLoadingBar'
import { ApiStatusBadge } from '@/components/ui/ApiStatusBadge'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSidebarClose = useCallback(() => setSidebarOpen(false), [])
  const handleMenuClick     = useCallback(() => setSidebarOpen(true),  [])

  return (
    <>
      <GlobalLoadingBar />

      <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] transition-colors duration-300">
        <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar onMenuClick={handleMenuClick} />

          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      <ApiStatusBadge />
    </>
  )
}
