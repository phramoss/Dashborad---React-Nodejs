import { useState, useEffect, useRef } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useSimuladorFiltros } from '@/store/simulador.store'
import {
  fetchSimuladorFiltros,
  fetchSimuladorMatriz,
  fetchSimuladorVendas,
  fetchSimuladorResumo,
} from '@/services/simulador.service'
import type { SimuladorFiltros } from '@/types'

function shallowEqual(a: SimuladorFiltros, b: SimuladorFiltros): boolean {
  const arrKeys: (keyof SimuladorFiltros)[] = ['materiais', 'blocos']
  for (const key of arrKeys) {
    const aArr = a[key]
    const bArr = b[key]
    if (aArr.length !== bArr.length) return false
    for (let i = 0; i < aArr.length; i++) {
      if (aArr[i] !== bArr[i]) return false
    }
  }
  return true
}

export function useSimuladorDebouncedFiltros(delay = 300): SimuladorFiltros {
  const filtros = useSimuladorFiltros()
  const [debounced, setDebounced] = useState<SimuladorFiltros>(filtros)
  const ref = useRef<SimuladorFiltros>(filtros)

  useEffect(() => {
    if (shallowEqual(filtros, ref.current)) return
    const timer = setTimeout(() => {
      ref.current = filtros
      setDebounced(filtros)
    }, delay)
    return () => clearTimeout(timer)
  }, [filtros, delay])

  return debounced
}

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

function qk(prefix: string, f: SimuladorFiltros) {
  return [prefix, f.materiais, f.blocos] as const
}

export function useSimuladorFiltrosDisponiveis() {
  return useQuery({
    queryKey:             ['simulador-filtros-disponiveis'],
    queryFn:              fetchSimuladorFiltros,
    staleTime:            1000 * 60 * 15,
    gcTime:               1000 * 60 * 60,
    refetchOnWindowFocus: false,
  })
}

export function useSimuladorMatriz() {
  const f = useSimuladorDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qk('simulador-matriz', f),
    queryFn:  () => fetchSimuladorMatriz(f),
  })
}

export function useSimuladorVendas() {
  const f = useSimuladorDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qk('simulador-vendas', f),
    queryFn:  () => fetchSimuladorVendas(f),
  })
}

export function useSimuladorResumo() {
  const f = useSimuladorDebouncedFiltros()
  return useQuery({
    ...BASE,
    queryKey: qk('simulador-resumo', f),
    queryFn:  () => fetchSimuladorResumo(f),
  })
}
