import { request } from './api'
import {
  fetchEstoqueChapa,
  fetchEstoqueBloco,
} from './estoque.service'
import type {
  BuracoVendasFiltros,
  BVMaterialComprado,
  EstoqueMatrizResult,
  EstoqueDrillState,
  EstoqueFiltros,
} from '@/types'
import type { MatrizSort } from '@/types'

// ─── Params base (filtros BV → query params API) ──────────────
export function toBVParams(f: BuracoVendasFiltros): Record<string, string> {
  const p: Record<string, string> = {}
  if (f.clientes.length > 0)   p.cod_cliente  = f.clientes.join(',')
  if (f.vendedores.length > 0) p.cod_vendedor = f.vendedores.join(',')
  if (f.materiais.length > 0)  p.cod_ma       = f.materiais.join(',')
  if (f.ufs.length > 0)        p.uf           = f.ufs.join(',')
  if (f.municipios.length > 0) p.municipio    = f.municipios.join(',')
  if (f.mercado.length > 0)    p.mercado      = f.mercado.join(',')
  if (f.data_ini)              p.data_ini     = f.data_ini
  if (f.data_fim)              p.data_fim     = f.data_fim
  return p
}

// ─── Params de drill ─────────────────────────────────────────
function toDrillParams(drill: EstoqueDrillState): Record<string, string> {
  const p: Record<string, string> = {}
  p.nivel = String(drill.nivel)
  drill.path.forEach(node => { p[node.field] = String(node.value) })
  return p
}

// ─── Converte BV filtros → subset para endpoints de estoque ──
export function bvToEstoqueFiltros(f: BuracoVendasFiltros): EstoqueFiltros {
  return {
    empresas:         [],
    materiais:        f.materiais,
    blocos:           [],
    espessuras:       [],
    industrializacao: [],
    situacao:         [],
    grupos:           [],
    chapas:           [],
    lotes:            [],
    unidades:         [],
    data_ini:         '',
    data_fim:         '',
  }
}

// ─── Bloco 1: Sequência de Vendas ────────────────────────────
export async function fetchBVSequencia(
  f:      BuracoVendasFiltros,
  drill:  EstoqueDrillState,
  sort?:  MatrizSort,
): Promise<EstoqueMatrizResult> {
  const params: Record<string, string> = { ...toBVParams(f), ...toDrillParams(drill) }
  if (sort?.col && sort?.dir) {
    params.sort_col = sort.col
    params.sort_dir = sort.dir
  }
  return request<EstoqueMatrizResult>({
    method: 'GET',
    url:    '/buraco-vendas/sequencia',
    params,
  })
}

// ─── Bloco 2: Estoque por Faturamento ────────────────────────
export async function fetchBVEstoqueFaturamento(
  f:      BuracoVendasFiltros,
  drill:  EstoqueDrillState,
  sort?:  MatrizSort,
): Promise<EstoqueMatrizResult> {
  const params: Record<string, string> = { ...toBVParams(f), ...toDrillParams(drill) }
  if (sort?.col && sort?.dir) { params.sort_col = sort.col; params.sort_dir = sort.dir }
  return request<EstoqueMatrizResult>({ method: 'GET', url: '/buraco-vendas/estoque-faturamento', params })
}

// ─── Bloco 3: Materiais Comprados ────────────────────────────
export async function fetchBVMateriaisComprados(
  f: BuracoVendasFiltros,
): Promise<BVMaterialComprado[]> {
  return request<BVMaterialComprado[]>({
    method: 'GET',
    url:    '/buraco-vendas/materiais-comprados',
    params: toBVParams(f),
  })
}

// ─── Blocos 4 e 5: reutilizam endpoints de estoque ───────────
export { fetchEstoqueChapa as fetchBVChapa, fetchEstoqueBloco as fetchBVBloco }
