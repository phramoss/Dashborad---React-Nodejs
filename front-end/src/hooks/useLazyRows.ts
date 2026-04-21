import { useState, useEffect, useRef } from 'react'

export function useLazyRows<T>(rows: T[], pageSize = 30) {
  const [page, setPage] = useState(1)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setPage(1) }, [rows])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPage(p => p + 1) },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const visible = rows.slice(0, page * pageSize)
  const hasMore = visible.length < rows.length
  return { visible, hasMore, sentinelRef }
}
