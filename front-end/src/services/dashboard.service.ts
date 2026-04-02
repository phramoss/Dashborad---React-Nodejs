/**
 * dashboard.service.ts
 *
 * Estratégia:
 *   1. Tenta endpoint novo (/analytics/kpi, /analytics/por-ano...)
 *   2. Se 404 → agrega do /faturamento (que sempre existiu)
 *   3. Se 500 → propaga erro
 *
 * O /faturamento retorna: { page, pageSize, rows: [...] }
 */

import { request } from './api'
import { toApiParams, toDrillParams, toDrillParamsChart } from './params-adapter'
import type {
  KpiSummary, FaturamentoPeriodo, FaturamentoCliente,
  FaturamentoMaterial, FaturamentoGrupo, FaturamentoVendedor,
  FiltroDashboard,
} from '@/types'

// ─── Helpers ─────────────────────────────────────────────────

function is404(err: unknown): boolean {
  const status = (err as { response?: { status: number } })?.response?.status
  return status === 404
}

// Row exata que /faturamento retorna
interface FatRow {
  cod_cliente?:  number | null
  nom_pess?:     string | null
  cod_vendedor?: number | null
  vendedor?:     string | null
  cod_ma?:       number | null
  material?:     string | null
  nom_ma?:       string | null
  cod_grp?:      number | null
  total_docit?:  number | null
  data_emisao?:  string | null
  data_saida?:   string | null
  unidade?:      string | null
  qtde?:         number | null
  mercado?:      string | null
  // Firebird às vezes retorna uppercase
  COD_CLIENTE?:  number | null
  NOM_PESS?:     string | null
  COD_VENDEDOR?: number | null
  VENDEDOR?:     string | null
  COD_MA?:       number | null
  MATERIAL?:     string | null
  NOM_MA?:       string | null
  COD_GRP?:      number | null
  TOTAL_DOCIT?:  number | null
  DATA_EMISAO?:  string | null
  UNIDADE?:      string | null
  QTDE?:         number | null
  MERCADO?:      string | null
}

// Normaliza row para lowercase (Firebird pode retornar uppercase)
function norm(r: FatRow) {
  return {
    cod_cliente:  Number(r.cod_cliente  ?? r.COD_CLIENTE  ?? 0),
    nom_pess:     String(r.nom_pess     ?? r.NOM_PESS     ?? ''),
    cod_vendedor: Number(r.cod_vendedor ?? r.COD_VENDEDOR ?? 0),
    vendedor:     String(r.vendedor     ?? r.VENDEDOR     ?? ''),
    cod_ma:       Number(r.cod_ma       ?? r.COD_MA       ?? 0),
    material:     String(r.nom_ma ?? r.NOM_MA ?? r.material ?? r.MATERIAL ?? ''),
    cod_grp:      r.cod_grp  ?? r.COD_GRP  ?? null,
    total:        Number(r.total_docit  ?? r.TOTAL_DOCIT  ?? 0),
    data_emisao:  r.data_emisao ?? r.DATA_EMISAO ?? null,
    unidade:      String(r.unidade ?? r.UNIDADE ?? ''),
    qtde:         Number(r.qtde ?? r.QTDE ?? 0),
    mercado:      String(r.mercado ?? r.MERCADO ?? ''),
  }
}

// Busca linhas brutas do /faturamento (endpoint original)
async function fetchFatRows(f: FiltroDashboard, anoOverride?: number): Promise<ReturnType<typeof norm>[]> {
  const params = anoOverride
    ? { ...toApiParams(f), data_ini: `${anoOverride}-01-01`, data_fim: `${anoOverride}-12-31`, pageSize: '200' }
    : { ...toApiParams(f), pageSize: '200' }

  const resp = await request<{ rows?: FatRow[] } | FatRow[]>({
    method: 'GET',
    url: '/faturamento',
    params,
  })

  // Suporta ambos os formatos: array direto ou { rows: [] }
  const rows: FatRow[] = Array.isArray(resp) ? resp : (resp.rows ?? [])
  return rows.map(norm)
}

// ─── Agregadores locais (usados no fallback) ──────────────────

function aggByKey<K extends number | string>(
  rows: ReturnType<typeof norm>[],
  getKey: (r: ReturnType<typeof norm>) => K | null,
  getLabel: (r: ReturnType<typeof norm>) => string,
): Map<K, { label: string; total: number }> {
  const map = new Map<K, { label: string; total: number }>()
  rows.forEach(r => {
    const k = getKey(r)
    if (k == null || k === 0) return
    const cur = map.get(k) ?? { label: getLabel(r), total: 0 }
    map.set(k, { label: cur.label || getLabel(r), total: cur.total + r.total })
  })
  return map
}

// ─── KPI ─────────────────────────────────────────────────────
export async function fetchKpiSummary(f: FiltroDashboard): Promise<KpiSummary> {
  try {
    return await request<KpiSummary>({ method: 'GET', url: '/analytics/kpi', params: toApiParams(f) })
  } catch (err) {
    if (!is404(err)) throw err
    console.info('[dashboard] fallback KPI via /faturamento')
    const rows = await fetchFatRows(f)
    const total = rows.reduce((s, r) => s + r.total, 0)
    const clientes = new Set(rows.map(r => r.cod_cliente).filter(Boolean))
    return {
      faturamento:         total,
      faturamentoAnterior: 0,
      variacaoFaturamento: 0,
      totalM2:    rows.filter(r => r.unidade === 'M2').reduce((s, r) => s + r.total, 0),
      qtdM2:      rows.filter(r => r.unidade === 'M2').reduce((s, r) => s + r.qtde, 0),
      totalM3:    rows.filter(r => r.unidade === 'M3').reduce((s, r) => s + r.total, 0),
      qtdM3:      rows.filter(r => r.unidade === 'M3').reduce((s, r) => s + r.qtde, 0),
      ticketMedio:     clientes.size > 0 ? total / clientes.size : 0,
      numeroPedidos:   clientes.size,
      pedidosExterior: new Set(rows.filter(r => r.mercado === 'Externo').map(r => r.cod_cliente)).size,
      pedidosInterno:  new Set(rows.filter(r => r.mercado === 'Interno').map(r => r.cod_cliente)).size,
    }
  }
}

// ─── Por Ano ─────────────────────────────────────────────────
export async function fetchFaturamentoPorAno(f: FiltroDashboard): Promise<FaturamentoPeriodo[]> {
  try {
    return await request<FaturamentoPeriodo[]>({ method: 'GET', url: '/analytics/por-ano', params: toApiParams(f) })
  } catch (err) {
    if (!is404(err)) throw err
    console.info('[dashboard] fallback por-ano via /faturamento')
    const rows = await fetchFatRows(f)
    const map = new Map<string, number>()
    rows.forEach(r => {
      if (!r.data_emisao) return
      const ano = String(new Date(r.data_emisao).getFullYear())
      map.set(ano, (map.get(ano) ?? 0) + r.total)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, faturamento]) => ({ periodo, faturamento }))
  }
}

// ─── Por Mês (drill-down) ─────────────────────────────────────
// FIX: usa toDrillParamsChart (sem meses) — o gráfico sempre busca TODOS os meses.
// A seleção de meses é apenas visual (dimming) + cross-filter de outros componentes.
export async function fetchFaturamentoPorMes(f: FiltroDashboard, ano: number): Promise<FaturamentoPeriodo[]> {
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  try {
    return await request<FaturamentoPeriodo[]>({ method: 'GET', url: '/analytics/por-mes', params: toDrillParamsChart(f, ano) })
  } catch (err) {
    if (!is404(err)) throw err
    console.info(`[dashboard] fallback por-mes (${ano}) via /faturamento`)
    // FIX: passa filtros sem meses para o fallback também
    const fSemMeses = { ...f, meses: [] as number[] }
    const rows = await fetchFatRows(fSemMeses, ano)
    const map = new Map<number, number>()
    rows.forEach(r => {
      if (!r.data_emisao) return
      const mes = new Date(r.data_emisao).getMonth()
      map.set(mes, (map.get(mes) ?? 0) + r.total)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([mes, faturamento]) => ({ periodo: MESES[mes], faturamento, mesNumero: mes + 1 }))
  }
}

// ─── Top Clientes ─────────────────────────────────────────────
export async function fetchTopClientes(f: FiltroDashboard, limit?: number): Promise<FaturamentoCliente[]> {
  try {
    const params = {
      ...toApiParams(f),
      ...(limit !== undefined && { limit: String(limit) }),
    }
    return await request<FaturamentoCliente[]>({ method: 'GET', url: '/analytics/top-clientes', params })
  } catch (err) {
    if (!is404(err)) throw err
    console.info('[dashboard] fallback top-clientes via /faturamento')
    const rows = await fetchFatRows(f)
    const map = aggByKey(rows, r => r.cod_cliente || null, r => r.nom_pess)
    const sorted = Array.from(map.entries())
      .map(([id, v]) => ({ clienteId: id, clienteNome: v.label, faturamento: v.total }))
      .sort((a, b) => b.faturamento - a.faturamento)
    return limit !== undefined ? sorted.slice(0, limit) : sorted
  }
}

// ─── Top Materiais ────────────────────────────────────────────
export async function fetchTopMateriais(f: FiltroDashboard, limit?: number): Promise<FaturamentoMaterial[]> {
  try {
    const params = {
      ...toApiParams(f),
      ...(limit !== undefined && { limit: String(limit) }),
    }
    return await request<FaturamentoMaterial[]>({ method: 'GET', url: '/analytics/top-materiais', params })
  } catch (err) {
    if (!is404(err)) throw err
    console.info('[dashboard] fallback top-materiais via /faturamento')
    const rows = await fetchFatRows(f)
    const map = aggByKey(rows, r => r.cod_ma || null, r => r.material)
    const sorted = Array.from(map.entries())
      .map(([id, v]) => ({ materialId: id, materialNome: v.label, faturamento: v.total }))
      .sort((a, b) => b.faturamento - a.faturamento)
    return limit !== undefined ? sorted.slice(0, limit) : sorted
  }
}

// ─── Por Grupo ────────────────────────────────────────────────
export async function fetchPorGrupo(f: FiltroDashboard): Promise<FaturamentoGrupo[]> {
  try {
    return await request<FaturamentoGrupo[]>({ method: 'GET', url: '/analytics/por-grupo', params: toApiParams(f) })
  } catch (err) {
    if (!is404(err)) throw err
    console.info('[dashboard] fallback por-grupo via /faturamento')
    const rows = await fetchFatRows(f)
    const map = new Map<number, number>()
    rows.forEach(r => { if (r.cod_grp != null) map.set(Number(r.cod_grp), (map.get(Number(r.cod_grp)) ?? 0) + r.total) })
    return Array.from(map.entries())
      .map(([id, total]) => ({ grupoId: id, grupoNome: `Grupo ${id}`, faturamento: total }))
      .sort((a, b) => b.faturamento - a.faturamento)
  }
}

// ─── Top Vendedores ───────────────────────────────────────────
export async function fetchTopVendedores(f: FiltroDashboard, limit = 20): Promise<FaturamentoVendedor[]> {
  try {
    return await request<FaturamentoVendedor[]>({ method: 'GET', url: '/analytics/top-vendedores', params: { ...toApiParams(f), limit: String(limit) } })
  } catch (err) {
    if (!is404(err)) throw err
    console.info('[dashboard] fallback top-vendedores via /faturamento')
    const rows = await fetchFatRows(f)
    const map = aggByKey(rows, r => r.cod_vendedor || null, r => r.vendedor)
    return Array.from(map.entries())
      .map(([id, v]) => ({ vendedorId: id, vendedorNome: v.label, faturamento: v.total }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, limit)
  }
}
// ─── Todos os meses de todos os anos (expandAll) ──────────────
export async function fetchFaturamentoTodosMeses(f: FiltroDashboard): Promise<(FaturamentoPeriodo & { ano: number; mesIdx: number })[]> {
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  // /analytics/serie/mensal retorna ano+mes+total de TODOS os períodos.
  // Mantemos apenas filtros não-temporais (cliente, vendedor, material, grupo).
  // Não passamos data_ini/data_fim — queremos a série histórica completa.
  const { anos: _anos, meses: _meses, granularidade: _g, ...otherFiltros } = f
  const baseParams = toApiParams({ ...otherFiltros, anos: [], meses: [], granularidade: 'ano' })

  try {
    const rows = await request<{ ano: number; mes: number; total: number }[]>({
      method: 'GET',
      url: '/analytics/serie/mensal',
      params: baseParams,
    })
    return rows.map(r => ({
      periodo:     `${MESES[(r.MES ?? r.mes) - 1] ?? '?'}/${String(r.ANO ?? r.ano).slice(2)}`,
      faturamento: Number(r.TOTAL ?? r.total ?? 0),
      ano:         Number(r.ANO   ?? r.ano),
      mesIdx:      Number(r.MES   ?? r.mes) - 1,
    }))
  } catch (err) {
    if (!is404(err)) throw err
    // Fallback: agrega do /faturamento sem filtro de data
    console.info('[dashboard] fallback serie/mensal via /faturamento')
    const rows = await fetchFatRows({ ...f, anos: [] })
    const map = new Map<string, { total: number; ano: number; mesIdx: number }>()
    rows.forEach(r => {
      if (!r.data_emisao) return
      const d   = new Date(r.data_emisao)
      const ano = d.getFullYear()
      const mes = d.getMonth()
      const key = `${ano}-${String(mes).padStart(2, '0')}`
      const cur = map.get(key) ?? { total: 0, ano, mesIdx: mes }
      map.set(key, { ...cur, total: cur.total + r.total })
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        periodo:     `${MESES[v.mesIdx]}/${String(v.ano).slice(2)}`,
        faturamento: v.total,
        ano:         v.ano,
        mesIdx:      v.mesIdx,
      }))
  }
}