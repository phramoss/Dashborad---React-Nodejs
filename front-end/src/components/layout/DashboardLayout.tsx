import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { GlobalLoadingBar } from '@/components/ui/GlobalLoadingBar'
import { ApiStatusBadge } from '@/components/ui/ApiStatusBadge'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <GlobalLoadingBar />

      <div className="flex h-screen w-screen overflow-hidden bg-[#030303]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4">
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