import { request } from './api'
import type {
  EstoqueKpi,
  EstoqueTableResult,
  EstoqueMatrizRow,
  EstoqueFiltrosDisponiveis,
  EstoqueFiltros,
} from '@/types'

export function toEstoqueParams(f: EstoqueFiltros): Record<string, string> {
  const p: Record<string, string> = {}

  if (f.empresas.length > 0)         p.empresa          = f.empresas.join(',')
  if (f.espessuras.length > 0)       p.esp_lq           = f.espessuras.join(',')
  if (f.industrializacao.length > 0) p.industrializacao = f.industrializacao.join(',')
  if (f.situacao.length > 0)         p.situacao         = f.situacao.join(',')
  if (f.blocos.length > 0)           p.bloco            = f.blocos.join(',')
  if (f.data_ini)                    p.data_ini         = f.data_ini
  if (f.data_fim)                    p.data_fim         = f.data_fim

  // materialFiltro (crossfilter por clique) sobrescreve materiais
  if (f.materialFiltro !== null) {
    p.cod_ma = String(f.materialFiltro)
  } else if (f.materiais.length > 0) {
    p.cod_ma = f.materiais.join(',')
  }

  return p
}

export async function fetchEstoqueKpi(f: EstoqueFiltros): Promise<EstoqueKpi> {
  return request<EstoqueKpi>({
    method: 'GET',
    url:    '/estoque/kpi',
    params: toEstoqueParams(f),
  })
}

export async function fetchEstoqueChapa(f: EstoqueFiltros): Promise<EstoqueTableResult> {
  return request<EstoqueTableResult>({
    method: 'GET',
    url:    '/estoque/chapa',
    params: toEstoqueParams(f),
  })
}

export async function fetchEstoqueBloco(f: EstoqueFiltros): Promise<EstoqueTableResult> {
  return request<EstoqueTableResult>({
    method: 'GET',
    url:    '/estoque/bloco',
    params: toEstoqueParams(f),
  })
}

export async function fetchEstoqueFaturamentoMatriz(f: EstoqueFiltros): Promise<EstoqueMatrizRow[]> {
  return request<EstoqueMatrizRow[]>({
    method: 'GET',
    url:    '/estoque/faturamento-matriz',
    params: toEstoqueParams(f),
  })
}

export async function fetchEstoqueFiltrosDisponiveis(): Promise<EstoqueFiltrosDisponiveis> {
  return request<EstoqueFiltrosDisponiveis>({
    method: 'GET',
    url:    '/estoque/filtros',
  })
}
