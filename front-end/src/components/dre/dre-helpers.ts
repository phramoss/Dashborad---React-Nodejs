import type { DreLinha } from '@/types'

export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export const fmtPct = (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

export const safe = (n: number | null | undefined) =>
  (n === null || n === undefined || !isFinite(n) || isNaN(n)) ? 0 : n

export function periodoLabel(p: number): string {
  const year  = Math.floor(p / 100)
  const month = p % 100
  const m = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][month - 1] ?? '?'
  return `${m}/${String(year).slice(-2)}`
}

export function rowStyle(linha: DreLinha, val: number) {
  const { tipo, cod } = linha
  if (tipo === 'A') {
    if (cod === 1) return { row: 'bg-brand/5', val: 'text-brand font-semibold' }
    return { row: '', val: 'text-text-primary' }
  }
  if (tipo === 'ST' || tipo === 'DT') {
    const accent = val >= 0 ? 'text-status-success' : 'text-status-danger'
    const bg     = cod === 14 ? 'bg-status-success/5' : cod === 11 ? 'bg-brand/5' : 'bg-surface-light/30'
    return { row: bg, val: `${accent} font-bold` }
  }
  if (tipo === 'M' || tipo === 'E' || tipo === 'I' || tipo === 'R' || tipo === 'L') {
    return { row: 'bg-surface-light/10', val: 'text-chart-purple font-medium' }
  }
  return { row: '', val: 'text-text-primary' }
}

export const TD_BASE    = 'px-2.5 py-1.5 text-[11px] tabular-nums text-right whitespace-nowrap'
export const TD_LEFT    = 'px-2.5 py-1.5 text-[11px] text-left whitespace-nowrap'
export const MIN_LABEL_W = 220
export const MIN_COL_W   = 100
export const MIN_TOT_W   = 110
