import { request } from './api'
import type {
  FinanceiroFiltros, FinanceiroKpi, FinanceiroBarItem,
  FinanceiroSemanal, FinanceiroSaldoBanco, FinanceiroFluxoCaixa,
  FinanceiroFiltrosDisponiveis,
} from '@/types'

function toParams(f: FinanceiroFiltros, extra?: Record<string, unknown>) {
  return {
    ...(f.moeda.length    && { moeda:       f.moeda.join(',')    }),
    ...(f.empresa.length  && { empresa:     f.empresa.join(',')  }),
    ...(f.clientes.length && { cod_cliente: f.clientes.join(',') }),
    venc_ini: f.venc_ini,
    venc_fim: f.venc_fim,
    emis_ini: f.emis_ini,
    emis_fim: f.emis_fim,
    ...extra,
  }
}

export const fetchFinanceiroKpi = (f: FinanceiroFiltros) =>
  request<FinanceiroKpi>({ method: 'GET', url: '/financeiro/kpi', params: toParams(f) })

export const fetchAReceber = (f: FinanceiroFiltros, agrupar: string) =>
  request<FinanceiroBarItem[]>({ method: 'GET', url: '/financeiro/a-receber', params: toParams(f, { agrupar }) })

export const fetchAPagar = (f: FinanceiroFiltros, agrupar: string) =>
  request<FinanceiroBarItem[]>({ method: 'GET', url: '/financeiro/a-pagar', params: toParams(f, { agrupar }) })

export const fetchMovimentoSemanal = (f: FinanceiroFiltros) =>
  request<FinanceiroSemanal[]>({ method: 'GET', url: '/financeiro/movimento-semanal', params: toParams(f) })

export const fetchSaldoBancario = () =>
  request<FinanceiroSaldoBanco[]>({ method: 'GET', url: '/financeiro/saldo-bancario' })

export const fetchFluxoCaixa = (f: FinanceiroFiltros) =>
  request<FinanceiroFluxoCaixa>({ method: 'GET', url: '/financeiro/fluxo-caixa', params: toParams(f) })

export const fetchFinanceiroFiltros = () =>
  request<FinanceiroFiltrosDisponiveis>({ method: 'GET', url: '/financeiro/filtros' })
