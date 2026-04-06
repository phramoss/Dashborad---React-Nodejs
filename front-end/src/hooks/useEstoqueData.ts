import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useEstoqueFiltros } from '@/store/estoque.store'
import {
  fetchEstoqueKpi,
  fetchEstoqueChapa,
  fetchEstoqueBloco,
  fetchEstoqueFaturamentoMatriz,
  fetchEstoqueFiltrosDisponiveis,
} from '@/services/estoque.service'
import type { EstoqueFiltros } from '@/types'

// ─── Debounce dos filtros de estoque ─────────────────────────
function shallowEqualEstoque(a: EstoqueFiltros, b: EstoqueFiltros): boolean {
  if (a.data_ini !== b.data_ini || a.data_fim !== b.data_fim) return false
  if (a.materialFiltro !== b.materialFiltro) return false
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
  const filtros    = useEstoqueFiltros()
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
  placeholderData:      (prev: unknown) => prev,
  retry: (count: number, err: unknown) => {
    const status = (err as { response?: { status: number } })?.response?.status
    if (status && status >= 400 && status < 500) return false
    return count < 2
  },
} as const

// ─── Query keys ───────────────────────────────────────────────
function qkEstoque(prefix: string, f: EstoqueFiltros) {
  return [
    prefix,
    f.empresas, f.materiais, f.blocos, f.espessuras,
    f.industrializacao, f.situacao, f.data_ini, f.data_fim,
    f.materialFiltro,
  ] as const
}

// ─── Hooks ───────────────────────────────────────────────────
export function useEstoqueKpi() {
  const f = useEstoqueDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qkEstoque('estoque-kpi', f),
    queryFn:  () => fetchEstoqueKpi(f),
  })
}

export function useEstoqueChapa() {
  const f = useEstoqueDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qkEstoque('estoque-chapa', f),
    queryFn:  () => fetchEstoqueChapa(f),
  })
}

export function useEstoqueBloco() {
  const f = useEstoqueDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qkEstoque('estoque-bloco', f),
    queryFn:  () => fetchEstoqueBloco(f),
  })
}

export function useEstoqueFaturamentoMatriz() {
  const f = useEstoqueDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qkEstoque('estoque-matriz', f),
    queryFn:  () => fetchEstoqueFaturamentoMatriz(f),
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
