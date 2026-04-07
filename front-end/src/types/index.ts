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

// Linha genérica retornada pelos endpoints de tabela (drill-down)
export interface EstoqueTableRow {
  label:    string           // texto exibido
  value:    string | number  // valor usado para drill e filtro
  metragem: number
  pc:       number
}

export interface EstoqueTableResult {
  nivel:    number
  maxNivel: number
  rows:     EstoqueTableRow[]
  totais:   { metragem: number; pc: number }
}

// Linha da matriz faturamento (pivot pelo frontend)
export interface EstoqueMatrizRow {
  label:      string
  value:      string | number
  ano:        number
  mes:        number
  quantidade: number
  total:      number
}

export interface EstoqueMatrizResult {
  nivel:    number
  maxNivel: number
  rows:     EstoqueMatrizRow[]
}

export interface EstoqueFiltrosDisponiveis {
  empresas:    { id: number; label: string }[]
  materiais:   { id: number; label: string }[]
  blocos:      number[]
  espessuras:  number[]
  composicoes: string[]
}

// Nó do breadcrumb de drill-down
export interface EstoqueDrillNode {
  nivel:  number
  label:  string           // texto exibido no breadcrumb
  field:  string           // nome do query param (e.g. 'drill_cod_ma')
  value:  string | number  // valor a ser passado como param
}

export interface EstoqueDrillState {
  nivel: number
  path:  EstoqueDrillNode[]
}

export interface EstoqueFiltros {
  empresas:         number[]
  materiais:        number[]
  blocos:           number[]
  espessuras:       number[]
  industrializacao: string[]
  situacao:         string[]
  grupos:           number[]   // COD_GRP — click filter nível 2 (Grupo)
  chapas:           number[]   // COD_ESTQ — click filter nível 5 (Chapa)
  lotes:            string[]   // LOTE — click filter nível 6 (Lote)
  unidades:         string[]   // UNIDADE — click filter nível folha (Chapa/Bloco/FAT)
  // período — apenas para estoque por faturamento
  data_ini:         string
  data_fim:         string
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