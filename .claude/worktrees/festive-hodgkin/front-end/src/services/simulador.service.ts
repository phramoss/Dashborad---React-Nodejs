import { request } from './api'
import type {
  SimuladorFiltros,
  SimuladorFiltrosDisponiveis,
  SimuladorMatrizResult,
  SimuladorChapaResult,
  SimuladorVendasResult,
  SimuladorResumo,
} from '@/types'

function toParams(f: SimuladorFiltros): Record<string, string> {
  const p: Record<string, string> = {}
  if (f.materiais.length > 0) p.cod_ma   = f.materiais.join(',')
  if (f.blocos.length > 0)    p.bloco    = f.blocos.join(',')
  if (f.situacao.length > 0)  p.situacao = f.situacao.join(',')
  return p
}

export async function fetchSimuladorFiltros(): Promise<SimuladorFiltrosDisponiveis> {
  return request<SimuladorFiltrosDisponiveis>({
    method: 'GET',
    url:    '/simulador/filtros',
  })
}

export async function fetchSimuladorMatriz(
  f: SimuladorFiltros,
): Promise<SimuladorMatrizResult> {
  return request<SimuladorMatrizResult>({
    method: 'GET',
    url:    '/simulador/matriz',
    params: toParams(f),
  })
}

export async function fetchSimuladorVendas(
  f: SimuladorFiltros,
): Promise<SimuladorVendasResult> {
  return request<SimuladorVendasResult>({
    method: 'GET',
    url:    '/simulador/vendas',
    params: toParams(f),
  })
}

export async function fetchSimuladorChapas(
  f: SimuladorFiltros,
): Promise<SimuladorChapaResult> {
  return request<SimuladorChapaResult>({
    method: 'GET',
    url:    '/simulador/chapas',
    params: toParams(f),
  })
}

export async function fetchSimuladorResumo(
  f: SimuladorFiltros,
): Promise<SimuladorResumo> {
  return request<SimuladorResumo>({
    method: 'GET',
    url:    '/simulador/resumo',
    params: toParams(f),
  })
}
