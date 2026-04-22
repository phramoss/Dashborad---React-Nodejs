export { buildRowKey, buildChildDrill } from '@/lib/drill-utils'

export const SEQ_FIELDS  = ['drill_cod_cliente']
export const FAT_FIELDS  = ['drill_cod_ma', 'drill_unidade', 'drill_cod_cliente']
export const CHAPA_FIELDS   = ['drill_cod_ma','drill_bloco','drill_grp','drill_esp','drill_ind','drill_cod_estq','drill_lote']
export const CHAPA_HEADERS  = ['Material','Bloco','Grupo','Espessura','Industrialização','Chapa','Lote','Unidade']
export const BLOCO_FIELDS   = ['drill_cod_ma','drill_bloco']
export const BLOCO_HEADERS  = ['Material','Bloco','Unidade']

import type { BuracoVendasFiltros, EstoqueDrillNode } from '@/types'

export function isBVTableRowActive(
  field:   string | undefined,
  value:   string | number,
  path:    EstoqueDrillNode[],
  filtros: BuracoVendasFiltros,
): boolean {
  if (field === 'drill_cod_ma') return filtros.materiais.includes(Number(value))
  const matNode = path.find(n => n.field === 'drill_cod_ma')
  if (!matNode) return false
  return filtros.materiais.includes(Number(matNode.value))
}

export function applyBVTableFilter(
  field:      string | undefined,
  value:      string | number,
  path:       EstoqueDrillNode[],
  filtros:    BuracoVendasFiltros,
  setFiltros: (p: Partial<BuracoVendasFiltros>) => void,
): void {
  const matId = field === 'drill_cod_ma'
    ? Number(value)
    : Number(path.find(n => n.field === 'drill_cod_ma')?.value ?? 0)
  if (!matId) return
  const arr = filtros.materiais
  setFiltros({ materiais: arr.includes(matId) ? arr.filter(v => v !== matId) : [...arr, matId] })
}

export function isBVSeqRowActive(
  field:   string | undefined,
  value:   string | number,
  filtros: BuracoVendasFiltros,
): boolean {
  if (field === 'drill_cod_cliente') return filtros.clientes.includes(Number(value))
  return false
}

export function applyBVSeqFilter(
  field:      string | undefined,
  value:      string | number,
  filtros:    BuracoVendasFiltros,
  setFiltros: (p: Partial<BuracoVendasFiltros>) => void,
): void {
  if (field !== 'drill_cod_cliente') return
  const id = Number(value)
  const arr = filtros.clientes
  setFiltros({ clientes: arr.includes(id) ? arr.filter(v => v !== id) : [...arr, id] })
}

export function isBVFatRowActive(
  field:   string | undefined,
  value:   string | number,
  path:    EstoqueDrillNode[],
  filtros: BuracoVendasFiltros,
): boolean {
  if (field === 'drill_cod_ma')      return filtros.materiais.includes(Number(value))
  if (field === 'drill_cod_cliente') return filtros.clientes.includes(Number(value))
  if (!field) {
    const matNode = path.find(n => n.field === 'drill_cod_ma')
    if (matNode) return filtros.materiais.includes(Number(matNode.value))
  }
  return false
}

export function applyBVFatFilter(
  field:      string | undefined,
  value:      string | number,
  path:       EstoqueDrillNode[],
  filtros:    BuracoVendasFiltros,
  setFiltros: (p: Partial<BuracoVendasFiltros>) => void,
): void {
  if (field === 'drill_cod_ma') {
    const id = Number(value)
    const arr = filtros.materiais
    setFiltros({ materiais: arr.includes(id) ? arr.filter(v => v !== id) : [...arr, id] })
    return
  }
  if (field === 'drill_cod_cliente') {
    const id = Number(value)
    const arr = filtros.clientes
    setFiltros({ clientes: arr.includes(id) ? arr.filter(v => v !== id) : [...arr, id] })
    return
  }
  const matNode = path.find(n => n.field === 'drill_cod_ma')
  if (!matNode) return
  const matId = Number(matNode.value)
  const arr = filtros.materiais
  setFiltros({ materiais: arr.includes(matId) ? arr.filter(v => v !== matId) : [...arr, matId] })
}
