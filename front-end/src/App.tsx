import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { OverviewPage } from '@/pages/OverviewPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/visao-geral" replace />} />
          <Route path="visao-geral" element={<OverviewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
