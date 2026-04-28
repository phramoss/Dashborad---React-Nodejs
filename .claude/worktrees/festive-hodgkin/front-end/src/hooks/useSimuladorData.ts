import { useState, useEffect, useRef } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useSimuladorFiltros } from '@/store/simulador.store'
import {
  fetchSimuladorFiltros,
  fetchSimuladorMatriz,
  fetchSimuladorChapas,
  fetchSimuladorVendas,
  fetchSimuladorResumo,
} from '@/services/simulador.service'
import type { SimuladorFiltros } from '@/types'

function shallowEqual(a: SimuladorFiltros, b: SimuladorFiltros): boolean {
  const arrKeys: (keyof SimuladorFiltros)[] = ['materiais', 'blocos', 'situacao']
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
  staleTime:            1000 * 60,
  gcTime:               1000 * 60 * 10,
  refetchOnWindowFocus: false,
  placeholderData:      keepPreviousData,
  retry: (count: number, err: unknown) => {
    const status = (err as { response?: { status: number } })?.response?.status
    if (status && status >= 400 && status < 500) return false
    return count < 1
  },
}

function qk(prefix: string, f: SimuladorFiltros) {
  return [prefix, f.materiais, f.blocos] as const
}

// Hook combinado: uma única instância de debounce para todas as queries do simulador.
// Evita 4 timers independentes que disparam 4 atualizações de estado separadas.
export function useSimuladorAll() {
  const f = useSimuladorDebouncedFiltros()

  const matriz = useQuery({
    ...BASE,
    queryKey: qk('simulador-matriz', f),
    queryFn:  () => fetchSimuladorMatriz(f),
  })

  const chapas = useQuery({
    ...BASE,
    queryKey: qk('simulador-chapas', f),
    queryFn:  () => fetchSimuladorChapas(f),
  })

  const vendas = useQuery({
    ...BASE,
    queryKey: qk('simulador-vendas', f),
    queryFn:  () => fetchSimuladorVendas(f),
  })

  const resumo = useQuery({
    ...BASE,
    queryKey: qk('simulador-resumo', f),
    queryFn:  () => fetchSimuladorResumo(f),
  })

  return { matriz, chapas, vendas, resumo }
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

