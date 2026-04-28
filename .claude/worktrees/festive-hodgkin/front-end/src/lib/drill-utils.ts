import type { EstoqueDrillNode, EstoqueDrillState } from '@/types'

export function buildRowKey(
  path: EstoqueDrillNode[],
  level: number,
  value: string | number,
): string {
  const p = path.map(n => `${n.nivel}:${n.value}`).join('/')
  return p ? `${p}/${level}:${value}` : `${level}:${value}`
}

export function buildChildDrill(
  path: EstoqueDrillNode[],
  level: number,
  field: string,
  value: string | number,
  label: string,
): EstoqueDrillState {
  const node: EstoqueDrillNode = { nivel: level, label, field, value }
  return { nivel: level + 1, path: [...path, node] }
}
