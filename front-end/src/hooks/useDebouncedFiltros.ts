import { useState, useEffect } from 'react'
import { useFiltros } from '@/store/filtros.store'
import type { FiltroDashboard } from '@/types'

export function useDebouncedFiltros(delay = 300): FiltroDashboard {
  const filtros = useFiltros()
  const [debounced, setDebounced] = useState<FiltroDashboard>(filtros)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filtros), delay)
    return () => clearTimeout(timer)
  }, [filtros, delay])

  return debounced
}
