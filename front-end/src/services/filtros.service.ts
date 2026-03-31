import { request } from './api'
import type { FiltroOption, FiltrosDisponiveis } from '@/types'

function is404(err: unknown) {
  return (err as { response?: { status: number } })?.response?.status === 404
}

interface FatRow {
  cod_cliente?: number | null;  COD_CLIENTE?: number | null
  nom_pess?: string | null;     NOM_PESS?: string | null
  cod_vendedor?: number | null; COD_VENDEDOR?: number | null
  vendedor?: string | null;     VENDEDOR?: string | null
  cod_ma?: number | null;       COD_MA?: number | null
  nom_ma?: string | null;       NOM_MA?: string | null
  material?: string | null;     MATERIAL?: string | null
  cod_grp?: number | null;      COD_GRP?: number | null
  data_emisao?: string | null;  DATA_EMISAO?: string | null
}

interface FatResponse { rows?: FatRow[] }

// Cache em memória: /faturamento só é chamado uma vez para popular filtros
let cachedRows: FatRow[] | null = null

async function getFatRows(): Promise<FatRow[]> {
  if (cachedRows) return cachedRows
  try {
    const resp = await request<FatResponse | FatRow[]>({
      method: 'GET', url: '/faturamento', params: { pageSize: '500' },
    })
    cachedRows = Array.isArray(resp) ? resp : (resp?.rows ?? [])
    // Limpa cache após 5 min
    setTimeout(() => { cachedRows = null }, 1000 * 60 * 5)
    return cachedRows
  } catch {
    return []
  }
}

function get(r: FatRow, low: string, up: string): string | number | null {
  return (r as Record<string, unknown>)[low] as string | number | null
    ?? (r as Record<string, unknown>)[up] as string | number | null
    ?? null
}

async function fetchAnos(): Promise<number[]> {
  try {
    return await request<number[]>({ method: 'GET', url: '/filtros/anos' })
  } catch (err) {
    if (!is404(err)) return []
    const rows = await getFatRows()
    const anos = new Set<number>()
    rows.forEach(r => {
      const d = get(r, 'data_emisao', 'DATA_EMISAO')
      if (d) anos.add(new Date(String(d)).getFullYear())
    })
    return Array.from(anos).sort((a, b) => b - a)
  }
}

async function fetchClientes(): Promise<FiltroOption[]> {
  try {
    return await request<FiltroOption[]>({ method: 'GET', url: '/filtros/clientes' })
  } catch (err) {
    if (!is404(err)) return []
    const rows = await getFatRows()
    const map = new Map<number, string>()
    rows.forEach(r => {
      const id = Number(get(r, 'cod_cliente', 'COD_CLIENTE'))
      const label = String(get(r, 'nom_pess', 'NOM_PESS') ?? '')
      if (id && label) map.set(id, label)
    })
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)))
  }
}

async function fetchVendedores(): Promise<FiltroOption[]> {
  try {
    return await request<FiltroOption[]>({ method: 'GET', url: '/filtros/vendedores' })
  } catch (err) {
    if (!is404(err)) return []
    const rows = await getFatRows()
    const map = new Map<number, string>()
    rows.forEach(r => {
      const id = Number(get(r, 'cod_vendedor', 'COD_VENDEDOR'))
      const label = String(get(r, 'vendedor', 'VENDEDOR') ?? '')
      if (id && label) map.set(id, label)
    })
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)))
  }
}

async function fetchMateriais(): Promise<FiltroOption[]> {
  try {
    return await request<FiltroOption[]>({ method: 'GET', url: '/filtros/materiais' })
  } catch (err) {
    if (!is404(err)) return []
    const rows = await getFatRows()
    const map = new Map<number, string>()
    rows.forEach(r => {
      const id = Number(get(r, 'cod_ma', 'COD_MA'))
      const label = String(get(r, 'nom_ma', 'NOM_MA') ?? get(r, 'material', 'MATERIAL') ?? '')
      if (id && label) map.set(id, label)
    })
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)))
  }
}

async function fetchGrupos(): Promise<FiltroOption[]> {
  try {
    return await request<FiltroOption[]>({ method: 'GET', url: '/filtros/grupos' })
  } catch (err) {
    if (!is404(err)) return []
    const rows = await getFatRows()
    const ids = new Set<number>()
    rows.forEach(r => {
      const id = Number(get(r, 'cod_grp', 'COD_GRP'))
      if (id) ids.add(id)
    })
    return Array.from(ids).sort().map(id => ({ id, label: `Grupo ${id}` }))
  }
}

export async function fetchFiltrosDisponiveis(): Promise<FiltrosDisponiveis> {
  const [anos, clientes, vendedores, materiais, grupos] = await Promise.all([
    fetchAnos(), fetchClientes(), fetchVendedores(), fetchMateriais(), fetchGrupos(),
  ])
  return { anos, clientes, vendedores, materiais, grupos }
}
