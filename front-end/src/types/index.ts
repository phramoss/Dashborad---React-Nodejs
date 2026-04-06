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
  mesNumero?: number     // presente no retorno de /analytics/por-mes (1-12)
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

export interface MapaMunicipio {
  geocodigo: string
  municipio: string
  uf: string
  lat: number
  lng: number
  faturamento: number
  numClientes: number
}

// ============================================================
// Filtros — o que o Zustand guarda
// ============================================================
export type GranularidadePeriodo = 'ano' | 'mes'

export interface FiltroDashboard {
  // Anos selecionados (convertidos para data_ini/data_fim ao chamar a API)
  anos: number[]
  meses: number[]         // meses selecionados (1-12) — dimming visual + cross-filter
  clientes: number[]
  vendedores: number[]
  materiais: number[]
  grupos: number[]
  ufs: string[]           // UFs selecionadas via clique no mapa (ex: ['ES', 'SP'])
  municipios: string[]    // Municípios selecionados via clique no mapa (ex: ['CASTELO', 'SERRA'])
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
  uf?:           string   // "ES,SP,MG"
  municipio?:    string   // "CASTELO,SERRA,SAO PAULO"
  meses?:        string   // "1,3,12" — filtro de meses (1-12)
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
// Estoque — tipos de domínio
// ============================================================

export interface EstoqueKpi {
  custoTotal: number
  totalM2:    number
  qtdM2:      number
  totalM3:    number
  qtdM3:      number
  cavaletes:  number
}

export interface EstoqueTableRow {
  codMa:    number
  material: string
  metragem: number
  pc:       number
}

export interface EstoqueTableResult {
  rows:   EstoqueTableRow[]
  totais: { metragem: number; pc: number }
}

export interface EstoqueMatrizRow {
  codMa:      number
  material:   string
  ano:        number
  mes:        number
  quantidade: number
  total:      number
}

export interface EstoqueFiltrosDisponiveis {
  empresas:    number[]
  materiais:   { id: number; label: string }[]
  blocos:      number[]
  espessuras:  number[]
  composicoes: string[]
}

export interface EstoqueFiltros {
  empresas:        number[]
  materiais:       number[]
  blocos:          number[]
  espessuras:      number[]
  industrializacao: string[]
  situacao:        string[]
  data_ini:        string
  data_fim:        string
  materialFiltro:  number | null   // crossfilter por clique na tabela
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