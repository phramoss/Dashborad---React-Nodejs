import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format number as Brazilian currency */
export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2).replace('.', ',')} Mi`
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(2).replace('.', ',')} Mil`
    }
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

/** Format large numbers with suffix */
export function formatNumber(value: number, decimals = 2): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(decimals)} Mi`
  if (value >= 1_000) return `${(value / 1_000).toFixed(decimals)} Mil`
  return value.toLocaleString('pt-BR', { maximumFractionDigits: decimals })
}

/** Format percentage */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2).replace('.', ',')}%`
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

/** Format ISO date to Brazilian format */
export function formatDate(iso: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(iso)
  if (format === 'long') {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  }
  return date.toLocaleDateString('pt-BR')
}

/** Extract readable message from API error */
export function parseApiError(error: unknown): string {
  if (!error) return 'Erro desconhecido'
  const e = error as { response?: { data?: { message?: string } }; message?: string }
  return (
    e?.response?.data?.message ??
    e?.message ??
    'Erro ao comunicar com o servidor'
  )
}

/** Debounce a callback */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ─── Formatação tabular ───────────────────────────────────────────────────────

/** Número decimal pt-BR — ex: 1.234,56 */
export function fmtNum(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Inteiro pt-BR — ex: 1.234 */
export function fmtInt(v: number): string {
  return Math.round(v).toLocaleString('pt-BR')
}

/** Alias de fmtNum para uso como moeda sem símbolo */
export const fmtCur = fmtNum

/** Moeda BRL completa — ex: R$ 1.234,56 */
export function fmtBRL(v: number, decimals: 0 | 2 = 2): string {
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Percentual pt-BR — ex: 12,34% */
export function fmtPct(v: number, alreadyPct = false): string {
  const val = alreadyPct ? v : v * 100
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

/** Meses abreviados pt-BR */
export const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'] as const
