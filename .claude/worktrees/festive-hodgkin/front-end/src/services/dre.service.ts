import { request } from './api'
import type { DreFiltros, DreResult, DreFiltrosDisponiveis } from '@/types'

function toParams(f: DreFiltros): Record<string, string> {
  return {
    modo:     f.modo,
    data_ini: f.data_ini,
    data_fim: f.data_fim,
  }
}

export async function fetchDre(f: DreFiltros): Promise<DreResult> {
  return request<DreResult>({ method: 'GET', url: '/dre', params: toParams(f) })
}

export async function fetchDreFiltros(): Promise<DreFiltrosDisponiveis> {
  return request<DreFiltrosDisponiveis>({ method: 'GET', url: '/dre/filtros' })
}
