import { request } from './api'
import type {
  EstoqueKpi,
  EstoqueTableResult,
  EstoqueMatrizResult,
  EstoqueFiltrosDisponiveis,
  EstoqueFiltros,
  EstoqueDrillState,
} from '@/types'

// ─── Params base (sem período) — para chapa/bloco/kpi ────────
function toStockParams(f: EstoqueFiltros): Record<string, string> {
  const p: Record<string, string> = {}
  if (f.empresas.length > 0)         p.empresa          = f.empresas.join(',')
  if (f.materiais.length > 0)        p.cod_ma           = f.materiais.join(',')
  if (f.blocos.length > 0)           p.bloco            = f.blocos.join(',')
  if (f.espessuras.length > 0)       p.esp_lq           = f.espessuras.join(',')
  if (f.industrializacao.length > 0) p.industrializacao = f.industrializacao.join(',')
  if (f.situacao.length > 0)         p.situacao         = f.situacao.join(',')
  return p
}

// ─── Params com período — apenas para faturamento ────────────
function toFatParams(f: EstoqueFiltros): Record<string, string> {
  const p: Record<string, string> = {}
  if (f.empresas.length > 0)  p.empresa  = f.empresas.join(',')
  if (f.materiais.length > 0) p.cod_ma   = f.materiais.join(',')
  if (f.data_ini)             p.data_ini = f.data_ini
  if (f.data_fim)             p.data_fim = f.data_fim
  return p
}

// ─── Params de drill (path acumulado) ────────────────────────
function toDrillParams(drill: EstoqueDrillState): Record<string, string> {
  const p: Record<string, string> = {}
  p.nivel = String(drill.nivel)
  drill.path.forEach(node => {
    p[node.field] = String(node.value)
  })
  return p
}

// ─── Exports ─────────────────────────────────────────────────
export async function fetchEstoqueKpi(f: EstoqueFiltros): Promise<EstoqueKpi> {
  return request<EstoqueKpi>({
    method: 'GET', url: '/estoque/kpi', params: toStockParams(f),
  })
}

export async function fetchEstoqueChapa(
  f:     EstoqueFiltros,
  drill: EstoqueDrillState,
): Promise<EstoqueTableResult> {
  return request<EstoqueTableResult>({
    method: 'GET',
    url:    '/estoque/chapa',
    params: { ...toStockParams(f), ...toDrillParams(drill) },
  })
}

export async function fetchEstoqueBloco(
  f:     EstoqueFiltros,
  drill: EstoqueDrillState,
): Promise<EstoqueTableResult> {
  return request<EstoqueTableResult>({
    method: 'GET',
    url:    '/estoque/bloco',
    params: { ...toStockParams(f), ...toDrillParams(drill) },
  })
}

export async function fetchEstoqueFaturamentoMatriz(
  f:     EstoqueFiltros,
  drill: EstoqueDrillState,
): Promise<EstoqueMatrizResult> {
  return request<EstoqueMatrizResult>({
    method: 'GET',
    url:    '/estoque/faturamento-matriz',
    params: { ...toFatParams(f), ...toDrillParams(drill) },
  })
}

export async function fetchEstoqueFiltrosDisponiveis(): Promise<EstoqueFiltrosDisponiveis> {
  return request<EstoqueFiltrosDisponiveis>({
    method: 'GET', url: '/estoque/filtros',
  })
}
