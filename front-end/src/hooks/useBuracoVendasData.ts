import { useState, useEffect, useRef } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useBVFiltros } from '@/store/buraco-vendas.store'
import {
  fetchBVSequencia,
  fetchBVEstoqueFaturamento,
  fetchBVMateriaisComprados,
  fetchBVChapa,
  fetchBVBloco,
  bvToEstoqueFiltros,
} from '@/services/buraco-vendas.service'
import { request } from '@/services/api'
import type { BuracoVendasFiltros, EstoqueDrillState, MatrizSort } from '@/types'

// ─── Debounce dos filtros BV ──────────────────────────────────
function shallowEqualBV(a: BuracoVendasFiltros, b: BuracoVendasFiltros): boolean {
  if (a.data_ini !== b.data_ini || a.data_fim !== b.data_fim) return false
  const arrKeys: (keyof BuracoVendasFiltros)[] = [
    'clientes', 'vendedores', 'materiais', 'ufs', 'municipios', 'mercado',
  ]
  for (const key of arrKeys) {
    const aArr = a[key] as (string | number)[]
    const bArr = b[key] as (string | number)[]
    if (aArr.length !== bArr.length) return false
    for (let i = 0; i < aArr.length; i++) {
      if (aArr[i] !== bArr[i]) return false
    }
  }
  return true
}

export function useBVDebouncedFiltros(delay = 300): BuracoVendasFiltros {
  const filtros = useBVFiltros()
  const [debounced, setDebounced] = useState<BuracoVendasFiltros>(filtros)
  const ref = useRef<BuracoVendasFiltros>(filtros)

  useEffect(() => {
    if (shallowEqualBV(filtros, ref.current)) return
    const timer = setTimeout(() => {
      ref.current = filtros
      setDebounced(filtros)
    }, delay)
    return () => clearTimeout(timer)
  }, [filtros, delay])

  return debounced
}

// ─── Query base ───────────────────────────────────────────────
const BASE = {
  staleTime:            1000 * 60 * 5,  // 5 min — dados analíticos não mudam a cada acesso
  gcTime:               1000 * 60 * 15,
  refetchOnWindowFocus: false,
  placeholderData:      keepPreviousData,
  retry: (count: number, err: unknown) => {
    const status = (err as { response?: { status: number } })?.response?.status
    if (status && status >= 400 && status < 500) return false
    return count < 1  // 1 retry apenas (era 2 — 3 chamadas desnecessárias em erro)
  },
}

function drillKey(drill: EstoqueDrillState) {
  return [drill.nivel, ...drill.path.map(n => `${n.field}=${n.value}`)]
}

function qk(prefix: string, f: BuracoVendasFiltros, drill?: EstoqueDrillState) {
  return [
    prefix,
    f.clientes, f.vendedores, f.materiais,
    f.ufs, f.municipios, f.mercado,
    f.data_ini, f.data_fim,
    ...(drill ? drillKey(drill) : []),
  ] as const
}

const DRILL_NONE: EstoqueDrillState = { nivel: 0, path: [] }

// ─── Bloco 1: Sequência de Vendas ────────────────────────────
export function useBVSequencia(sort?: MatrizSort) {
  const f = useBVDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: [...qk('bv-seq', f), sort?.col ?? '', sort?.dir ?? ''],
    queryFn:  () => fetchBVSequencia(f, DRILL_NONE, sort),
  })
}

export function useBVSequenciaChildren(localDrill: EstoqueDrillState) {
  const f = useBVDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qk('bv-seq-child', f, localDrill),
    queryFn:  () => fetchBVSequencia(f, localDrill),
    enabled:  localDrill.nivel > 0 && localDrill.path.length > 0,
  })
}

// ─── Bloco 2: Estoque por Faturamento ────────────────────────
export function useBVEstoqueFaturamento(sort?: MatrizSort) {
  const f = useBVDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: [...qk('bv-fat', f), sort?.col ?? '', sort?.dir ?? ''],
    queryFn:  () => fetchBVEstoqueFaturamento(f, DRILL_NONE, sort),
  })
}

export function useBVEstoqueFaturamentoChildren(localDrill: EstoqueDrillState) {
  const f = useBVDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qk('bv-fat-child', f, localDrill),
    queryFn:  () => fetchBVEstoqueFaturamento(f, localDrill),
    enabled:  localDrill.nivel > 0 && localDrill.path.length > 0,
  })
}

// ─── Bloco 3: Materiais Comprados ────────────────────────────
export function useBVMateriaisComprados() {
  const f = useBVDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qk('bv-mat', f),
    queryFn:  () => fetchBVMateriaisComprados(f),
  })
}

// ─── Bloco 4: Chapa / Recortado ──────────────────────────────
export function useBVChapa() {
  const f  = useBVDebouncedFiltros()
  const ef = bvToEstoqueFiltros(f)
  return useQuery({
    ...BASE,
    queryKey: ['bv-chapa', f.materiais],
    queryFn:  () => fetchBVChapa(ef, DRILL_NONE),
  })
}

export function useBVTableChildren(
  endpoint:   'chapa' | 'bloco',
  localDrill: EstoqueDrillState,
) {
  const f  = useBVDebouncedFiltros()
  const ef = bvToEstoqueFiltros(f)
  return useQuery({
    ...BASE,
    queryKey: [`bv-${endpoint}-child`, f.materiais, drillKey(localDrill)],
    queryFn:  () =>
      endpoint === 'chapa'
        ? fetchBVChapa(ef, localDrill)
        : fetchBVBloco(ef, localDrill),
    enabled: localDrill.nivel > 0 && localDrill.path.length > 0,
  })
}

// ─── Bloco 5: Bloco ──────────────────────────────────────────
export function useBVBloco() {
  const f  = useBVDebouncedFiltros()
  const ef = bvToEstoqueFiltros(f)
  return useQuery({
    ...BASE,
    queryKey: ['bv-bloco', f.materiais],
    queryFn:  () => fetchBVBloco(ef, DRILL_NONE),
  })
}

// ─── Filtros disponíveis (reusa /filtros/*) ──────────────────
export function useBVUfs() {
  return useQuery<string[]>({
    queryKey:             ['filtros-ufs'],
    queryFn:              () => request<string[]>({ method: 'GET', url: '/filtros/ufs' }),
    staleTime:            1000 * 60 * 30,
    gcTime:               1000 * 60 * 60,
    refetchOnWindowFocus: false,
  })
}

export function useBVMercados() {
  return useQuery<string[]>({
    queryKey:             ['filtros-mercados'],
    queryFn:              () => request<string[]>({ method: 'GET', url: '/filtros/mercados' }),
    staleTime:            1000 * 60 * 30,
    gcTime:               1000 * 60 * 60,
    refetchOnWindowFocus: false,
  })
}
