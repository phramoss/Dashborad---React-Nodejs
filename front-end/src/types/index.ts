// ============================================================
// Tipos de domínio — espelham exatamente o que a API retorna
// ============================================================

export interface KpiSummary {
  faturamento: number
  faturamentoAnterior: number
  variacaoFaturamento: number
  totalM2: number
  qtdM2: number
  totalM3: number
  qtdM3: number
  ticketMedio: number
  numeroPedidos: number
  pedidosExterior: number
  pedidosInterno: number
}

export interface FaturamentoPeriodo {
  periodo: string        
  faturamento: number
}

export interface FaturamentoCliente {
  clienteId: number
  clienteNome: string
  faturamento: number
}

export interface FaturamentoMaterial {
  materialId: number
  materialNome: string
  faturamento: number
}

export interface FaturamentoGrupo {
  grupoId: number | string
  grupoNome: string
  faturamento: number
}

export interface FaturamentoVendedor {
  vendedorId: number
  vendedorNome: string
  faturamento: number
}

// ============================================================
// Filtros — o que o Zustand guarda
// ============================================================
export type GranularidadePeriodo = 'ano' | 'mes'

export interface FiltroDashboard {
  // Anos selecionados (convertidos para data_ini/data_fim ao chamar a API)
  anos: number[]
  clientes: number[]
  vendedores: number[]
  materiais: number[]
  grupos: number[]
  granularidade: GranularidadePeriodo
}

// ============================================================
// Params reais que a API aceita (montados pelo adapter)
// ============================================================
export interface ApiQueryParams {
  cod_cliente?:  string   // "1,2,3"
  cod_vendedor?: string
  cod_ma?:       string
  cod_grp?:      string
  data_ini?:     string   // "YYYY-MM-DD"
  data_fim?:     string
  data_tipo?:    'emissao' | 'saida'
  limit?:        string
}

// ============================================================
// Opções para os dropdowns de filtro
// ============================================================
export interface FiltroOption {
  id: number | string
  label: string
}

export interface FiltrosDisponiveis {
  anos: number[]
  clientes: FiltroOption[]
  vendedores: FiltroOption[]
  materiais: FiltroOption[]
  grupos: FiltroOption[]
}

// ============================================================
// Auth / Erros
// ============================================================
export interface Usuario {
  id: number
  nome: string
  email: string
}

export interface ApiError {
  message: string
  code?: string
}
