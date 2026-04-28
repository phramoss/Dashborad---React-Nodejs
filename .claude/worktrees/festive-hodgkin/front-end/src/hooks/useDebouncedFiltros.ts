import { useState, useEffect, useRef } from 'react'
import { useFiltros } from '@/store/filtros.store'
import type { FiltroDashboard } from '@/types'

/**
 * Compara dois FiltroDashboard por valor (shallow array equality).
 * Evita que uma nova referência de objeto com os MESMOS valores
 * dispare um debounce desnecessário → menos fetches.
 */
function shallowEqualFiltros(a: FiltroDashboard, b: FiltroDashboard): boolean {
  if (a.granularidade !== b.granularidade) return false
  const arrKeys: (keyof FiltroDashboard)[] = ['anos', 'meses', 'clientes', 'vendedores', 'materiais', 'grupos']
  for (const key of arrKeys) {
    const arrA = a[key] as number[]
    const arrB = b[key] as number[]
    if (arrA.length !== arrB.length) return false
    for (let i = 0; i < arrA.length; i++) {
      if (arrA[i] !== arrB[i]) return false
    }
  }
  // UFs são string[]
  if (a.ufs.length !== b.ufs.length) return false
  for (let i = 0; i < a.ufs.length; i++) {
    if (a.ufs[i] !== b.ufs[i]) return false
  }
  // Municípios são string[]
  if (a.municipios.length !== b.municipios.length) return false
  for (let i = 0; i < a.municipios.length; i++) {
    if (a.municipios[i] !== b.municipios[i]) return false
  }
  return true
}

export function useDebouncedFiltros(delay = 300): FiltroDashboard {
  const filtros = useFiltros()
  const [debounced, setDebounced] = useState<FiltroDashboard>(filtros)
  // Ref para comparar sem precisar incluir debounced nas deps do useEffect
  const debouncedRef = useRef<FiltroDashboard>(filtros)

  useEffect(() => {
    // Se os valores são idênticos, não agenda atualização
    if (shallowEqualFiltros(filtros, debouncedRef.current)) return

    const timer = setTimeout(() => {
      debouncedRef.current = filtros
      setDebounced(filtros)
    }, delay)
    return () => clearTimeout(timer)
  }, [filtros, delay])

  return debounced
}