import type { EstoqueDrillNode, EstoqueFiltros } from '@/types'
export { buildRowKey, buildChildDrill } from '@/lib/drill-utils'

export const CHAPA_HEADERS = [
  'Material', 'Bloco', 'Grupo', 'Espessura', 'Industrialização', 'Chapa', 'Lote', 'Unidade',
]
export const CHAPA_FIELDS = [
  'drill_cod_ma', 'drill_bloco', 'drill_grp', 'drill_esp',
  'drill_ind', 'drill_cod_estq', 'drill_lote',
]
export const BLOCO_HEADERS = ['Material', 'Bloco', 'Unidade']
export const BLOCO_FIELDS  = ['drill_cod_ma', 'drill_bloco']

export const FAT_HEADERS = ['Material', 'Unidade', 'Cliente', 'Pedido']
export const FAT_FIELDS  = ['drill_cod_ma', 'drill_unidade', 'drill_cod_cliente']

export const FIELD_TO_FILTRO: Partial<Record<string, keyof EstoqueFiltros>> = {
  'drill_cod_ma':   'materiais',
  'drill_bloco':    'blocos',
  'drill_grp':      'grupos',
  'drill_esp':      'espessuras',
  'drill_ind':      'industrializacao',
  'drill_cod_estq': 'chapas',
  'drill_lote':     'lotes',
  'drill_unidade':  'unidades',
}
export const STRING_FILTROS = new Set<keyof EstoqueFiltros>(['industrializacao', 'lotes', 'unidades'])

export function isRowActive(
  level: number,
  value: string | number,
  field: string | undefined,
  path: EstoqueDrillNode[],
  filtros: EstoqueFiltros,
  isFat = false,
): boolean {
  if (isFat && (field === 'drill_cod_cliente' || (!field && level >= 3))) {
    const matNode = path.find(n => n.field === 'drill_cod_ma')
    if (!matNode) return false
    return filtros.materiais.includes(Number(matNode.value))
  }
  const key: keyof EstoqueFiltros | undefined = field
    ? FIELD_TO_FILTRO[field]
    : (isFat ? undefined : 'unidades')
  if (!key) return false
  const arr = filtros[key] as (string | number)[]
  const v = STRING_FILTROS.has(key) ? String(value) : Number(value)
  return arr.includes(v as never)
}

export function applyClickFilter(
  level: number,
  value: string | number,
  field: string | undefined,
  path: EstoqueDrillNode[],
  filtros: EstoqueFiltros,
  setFiltros: (p: Partial<EstoqueFiltros>) => void,
  isFat = false,
): void {
  if (isFat && (field === 'drill_cod_cliente' || (!field && level >= 3))) {
    const matNode = path.find(n => n.field === 'drill_cod_ma')
    if (!matNode) return
    const matId = Number(matNode.value)
    const arr = filtros.materiais
    setFiltros({ materiais: arr.includes(matId) ? arr.filter(v => v !== matId) : [...arr, matId] })
    return
  }
  const key: keyof EstoqueFiltros | undefined = field
    ? FIELD_TO_FILTRO[field]
    : (isFat ? undefined : 'unidades')
  if (!key) return
  const isStr = STRING_FILTROS.has(key)
  const v = isStr ? String(value) : Number(value)
  const arr = filtros[key] as (string | number)[]
  setFiltros({ [key]: arr.includes(v as never) ? arr.filter(x => x !== v) : [...arr, v] } as Partial<EstoqueFiltros>)
}
