import { useState, useEffect, useRef } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useEstoqueStore, useEstoqueFiltros } from '@/store/estoque.store'
import {
  fetchEstoqueKpi,
  fetchEstoqueChapa,
  fetchEstoqueBloco,
  fetchEstoqueFaturamentoMatriz,
  fetchEstoqueFiltrosDisponiveis,
} from '@/services/estoque.service'
import type { EstoqueFiltros, EstoqueDrillState, MatrizSort } from '@/types'

// ─── Debounce dos filtros de estoque ─────────────────────────
function shallowEqualEstoque(a: EstoqueFiltros, b: EstoqueFiltros): boolean {
  if (a.data_ini !== b.data_ini || a.data_fim !== b.data_fim) return false
  const arrKeys: (keyof EstoqueFiltros)[] = [
    'empresas', 'materiais', 'blocos', 'espessuras', 'industrializacao', 'situacao',
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

export function useEstoqueDebouncedFiltros(delay = 300): EstoqueFiltros {
  const filtros = useEstoqueFiltros()
  const [debounced, setDebounced] = useState<EstoqueFiltros>(filtros)
  const ref = useRef<EstoqueFiltros>(filtros)

  useEffect(() => {
    if (shallowEqualEstoque(filtros, ref.current)) return
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
  staleTime:            1000 * 30,
  gcTime:               1000 * 60 * 5,
  refetchOnWindowFocus: false,
  placeholderData:      keepPreviousData,
  retry: (count: number, err: unknown) => {
    const status = (err as { response?: { status: number } })?.response?.status
    if (status && status >= 400 && status < 500) return false
    return count < 2
  },
}

function drillKey(drill: EstoqueDrillState) {
  return [drill.nivel, ...drill.path.map(n => `${n.field}=${n.value}`)]
}

function qk(prefix: string, f: EstoqueFiltros, drill?: EstoqueDrillState) {
  return [
    prefix,
    f.empresas, f.materiais, f.blocos, f.espessuras,
    f.industrializacao, f.situacao, f.data_ini, f.data_fim,
    ...(drill ? drillKey(drill) : []),
  ] as const
}

// ─── Hooks ───────────────────────────────────────────────────
export function useEstoqueKpi() {
  const f = useEstoqueDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qk('estoque-kpi', f),
    queryFn:  () => fetchEstoqueKpi(f),
  })
}

export function useEstoqueChapa() {
  const f     = useEstoqueDebouncedFiltros()
  const drill = useEstoqueStore((s) => s.drillChapa)
  return useQuery({
    ...BASE,
    queryKey: qk('estoque-chapa', f, drill),
    queryFn:  () => fetchEstoqueChapa(f, drill),
  })
}

export function useEstoqueBloco() {
  const f     = useEstoqueDebouncedFiltros()
  const drill = useEstoqueStore((s) => s.drillBloco)
  return useQuery({
    ...BASE,
    queryKey: qk('estoque-bloco', f, drill),
    queryFn:  () => fetchEstoqueBloco(f, drill),
  })
}

export function useEstoqueFaturamentoMatriz(sort?: MatrizSort) {
  const f     = useEstoqueDebouncedFiltros()
  const drill = useEstoqueStore((s) => s.drillFat)
  return useQuery({
    ...BASE,
    queryKey: [...qk('estoque-matriz', f, drill), sort?.col ?? '', sort?.dir ?? ''],
    queryFn:  () => fetchEstoqueFaturamentoMatriz(f, drill, sort),
  })
}

// ─── Hooks para filhos inline (expansão hierárquica) ─────────
// Estes hooks aceitam um drillState LOCAL (não do store global),
// permitindo buscar filhos de uma linha específica sem alterar o drill global.

export function useEstoqueTableChildren(
  endpoint: 'chapa' | 'bloco',
  localDrill: EstoqueDrillState,
) {
  const f = useEstoqueDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qk(`estoque-${endpoint}-child`, f, localDrill),
    queryFn: () =>
      endpoint === 'chapa'
        ? fetchEstoqueChapa(f, localDrill)
        : fetchEstoqueBloco(f, localDrill),
    enabled: localDrill.nivel > 0 && localDrill.path.length > 0,
  })
}

export function useEstoqueMatrizChildren(localDrill: EstoqueDrillState) {
  const f = useEstoqueDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qk('estoque-fat-child', f, localDrill),
    queryFn: () => fetchEstoqueFaturamentoMatriz(f, localDrill),
    enabled: localDrill.nivel > 0 && localDrill.path.length > 0,
  })
}

export function useEstoqueFiltrosDisponiveis() {
  return useQuery({
    queryKey:             ['estoque-filtros-disponiveis'],
    queryFn:              fetchEstoqueFiltrosDisponiveis,
    staleTime:            1000 * 60 * 15,
    gcTime:               1000 * 60 * 60,
    refetchOnWindowFocus: false,
  })
}
