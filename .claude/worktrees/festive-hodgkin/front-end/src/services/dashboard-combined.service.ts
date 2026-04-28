/**
 * dashboard-combined.service.ts
 *
 * PERFORMANCE: Usa o endpoint combinado /analytics/dashboard que retorna
 * KPI + porAno + topClientes + topMateriais + topVendedores + porGrupo
 * em 1 único request HTTP. Se o endpoint não existir (404), faz fallback
 * para os endpoints individuais em paralelo.
 *
 * Resultado: 1 roundtrip em vez de ~7 requests paralelos.
 */

import { request } from './api'
import { toApiParams } from './params-adapter'
import type {
  KpiSummary, FaturamentoPeriodo, FaturamentoCliente,
  FaturamentoMaterial, FaturamentoGrupo, FaturamentoVendedor,
  FiltroDashboard,
} from '@/types'
import {
  fetchKpiSummary,
  fetchFaturamentoPorAno,
  fetchTopClientes,
  fetchTopMateriais,
  fetchPorGrupo,
  fetchTopVendedores,
} from './dashboard.service'

export interface DashboardCombinedData {
  kpi: KpiSummary
  porAno: FaturamentoPeriodo[]
  topClientes: FaturamentoCliente[]
  topVendedores: FaturamentoVendedor[]
  porGrupo: FaturamentoGrupo[]
  topMateriais: FaturamentoMaterial[]
}

function is404(err: unknown): boolean {
  const status = (err as { response?: { status: number } })?.response?.status
  return status === 404
}

/**
 * Tenta buscar tudo de uma vez. Se 404, faz fallback para endpoints individuais.
 */
export async function fetchDashboardCombined(f: FiltroDashboard): Promise<DashboardCombinedData> {
  try {
    const data = await request<DashboardCombinedData>({
      method: 'GET',
      url: '/analytics/dashboard',
      params: toApiParams(f),
    })
    return data
  } catch (err) {
    if (!is404(err)) throw err

    // Fallback: endpoints individuais em paralelo
    console.info('[dashboard-combined] fallback para endpoints individuais')
    const [kpi, porAno, topClientes, topMateriais, porGrupo, topVendedores] = await Promise.all([
      fetchKpiSummary(f),
      fetchFaturamentoPorAno(f),
      fetchTopClientes(f, 20),
      fetchTopMateriais(f, 20),
      fetchPorGrupo(f),
      fetchTopVendedores(f, 20),
    ])
    return { kpi, porAno, topClientes, topVendedores, porGrupo, topMateriais }
  }
}
