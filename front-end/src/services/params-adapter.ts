/**
 * params-adapter.ts
 */

import type { FiltroDashboard, ApiQueryParams } from '@/types'

function anosToDateRange(anos: number[]): Pick<ApiQueryParams, 'data_ini' | 'data_fim'> {
  if (anos.length === 0) return {}
  const sorted = [...anos].sort()
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  return {
    data_ini: `${min}-01-01`,
    data_fim: `${max}-12-31`,
  }
}

export function toApiParams(filtros: FiltroDashboard): ApiQueryParams {
  const params: ApiQueryParams = {
    data_tipo: 'emissao',
  }

  Object.assign(params, anosToDateRange(filtros.anos))

  if (filtros.clientes.length > 0)   params.cod_cliente  = filtros.clientes.join(',')
  if (filtros.vendedores.length > 0)  params.cod_vendedor = filtros.vendedores.join(',')
  if (filtros.materiais.length > 0)   params.cod_ma       = filtros.materiais.join(',')
  if (filtros.grupos.length > 0)      params.cod_grp      = filtros.grupos.join(',')

  // ✅ Envia meses selecionados para o back-end
  if (filtros.meses.length > 0)       params.meses        = filtros.meses.join(',')

  return params
}

export function toDrillParams(filtros: FiltroDashboard, ano: number): ApiQueryParams {
  return {
    ...toApiParams(filtros),
    data_ini: `${ano}-01-01`,
    data_fim: `${ano}-12-31`,
    data_tipo: 'emissao',
    // ✅ Mantém filtro de meses no drill-down
    ...(filtros.meses.length > 0 ? { meses: filtros.meses.join(',') } : {}),
  }
}
