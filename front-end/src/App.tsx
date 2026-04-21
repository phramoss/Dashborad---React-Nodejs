import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useThemeStore } from '@/store/theme.store'

const OverviewPage     = lazy(() => import('@/pages/OverviewPage').then(m => ({ default: m.OverviewPage })))
const EstoquePage      = lazy(() => import('@/pages/EstoquePage').then(m => ({ default: m.EstoquePage })))
const BuracoVendasPage = lazy(() => import('@/pages/BuracoVendasPage').then(m => ({ default: m.BuracoVendasPage })))
const SimuladorPage    = lazy(() => import('@/pages/SimuladorPage').then(m => ({ default: m.SimuladorPage })))
const DrePage          = lazy(() => import('@/pages/DrePage').then(m => ({ default: m.DrePage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )
}

export default function App() {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/visao-geral" replace />} />
          <Route path="visao-geral"   element={<Suspense fallback={<PageLoader />}><OverviewPage /></Suspense>} />
          <Route path="estoque"       element={<Suspense fallback={<PageLoader />}><EstoquePage /></Suspense>} />
          <Route path="buraco-vendas" element={<Suspense fallback={<PageLoader />}><BuracoVendasPage /></Suspense>} />
          <Route path="simulador"     element={<Suspense fallback={<PageLoader />}><SimuladorPage /></Suspense>} />
          <Route path="dre"           element={<Suspense fallback={<PageLoader />}><DrePage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
