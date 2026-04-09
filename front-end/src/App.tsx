import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { OverviewPage } from '@/pages/OverviewPage'
import { EstoquePage } from '@/pages/EstoquePage'
import { BuracoVendasPage } from '@/pages/BuracoVendasPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/visao-geral" replace />} />
          <Route path="visao-geral"    element={<OverviewPage />} />
          <Route path="estoque"        element={<EstoquePage />} />
          <Route path="buraco-vendas"  element={<BuracoVendasPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
