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
  mesNumero?: number
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

export type GranularidadePeriodo = 'ano' | 'mes'

export interface FiltroDashboard {
  anos: number[]
  meses: number[]
  clientes: number[]
  vendedores: number[]
  materiais: number[]
  grupos: number[]
  ufs: string[]
  municipios: string[]
  granularidade: GranularidadePeriodo
}

export interface ApiQueryParams {
  cod_cliente?:  string
  cod_vendedor?: string
  cod_ma?:       string
  cod_grp?:      string
  uf?:           string
  municipio?:    string
  meses?:        string
  data_ini?:     string
  data_fim?:     string
  data_tipo?:    'emissao' | 'saida'
  limit?:        string
}

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

export interface EstoqueKpi {
  custoTotal: number
  totalM2:    number
  qtdM2:      number
  totalM3:    number
  qtdM3:      number
  cavaletes:  number
}

export interface EstoqueTableRow {
  label:    string
  value:    string | number
  metragem: number
  pc:       number
}

export interface EstoqueTableResult {
  nivel:    number
  maxNivel: number
  rows:     EstoqueTableRow[]
  totais:   { metragem: number; pc: number }
}

export interface EstoqueMatrizRow {
  label:           string
  value:           string | number
  ano:             number
  mes:             number
  quantidade:      number
  total:           number
  campoAdicional?: string
  limite?:         number
}

export interface EstoqueMatrizResult {
  nivel:    number
  maxNivel: number
  rows:     EstoqueMatrizRow[]
}

export interface MatrizSort {
  col: string | null
  dir: 'asc' | 'desc' | null
}

export interface EstoqueFiltrosDisponiveis {
  empresas:    { id: number; label: string }[]
  materiais:   { id: number; label: string }[]
  blocos:      number[]
  espessuras:  number[]
  composicoes: string[]
}

export interface EstoqueDrillNode {
  nivel:  number
  label:  string
  field:  string
  value:  string | number
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
  grupos:           number[]
  chapas:           number[]
  lotes:            string[]
  unidades:         string[]
  data_ini:         string
  data_fim:         string
}

export interface BuracoVendasFiltros {
  data_ini:   string
  data_fim:   string
  clientes:   number[]
  vendedores: number[]
  materiais:  number[]
  ufs:        string[]
  municipios: string[]
  mercado:    string[]
}

export interface BVMaterialComprado {
  materialId:    number
  material:      string
  codGrp:        number | null
  ultimaVenda:   string | null
  qtdeM2:        number
  qtdeM3:        number
  qtdePc:        number
  numPedidos:    number
  totalFaturado: number
}

export interface Usuario {
  id: number
  nome: string
  email: string
}

export interface ApiError {
  message: string
  code?: string
}

export interface SimuladorFiltros {
  materiais: number[]
  blocos:    number[]
  situacao:  string[]
}

export interface SimuladorFiltrosDisponiveis {
  materiais: { id: number; label: string }[]
  blocos:    number[]
}

export interface SimuladorMatrizRow {
  codMa:       number
  material:    string
  nBloco:      number
  vendidas:    number
  pc:          number
  pcRestante:  number
  compra:      number
  frete:       number
  serrada:     number
  polimento:   number
  outCustos:   number
  outDesp:     number
  servicos:    number
  custoTotal:  number
  metrosTotal: number
  custoM2:     number
}

export interface SimuladorMatrizResult {
  rows: SimuladorMatrizRow[]
}

export interface SimuladorChapaRow {
  codMa:       number
  material:    string
  nBloco:      number
  chapa:       number
  pc:          number
  custoTotal:  number
  metrosTotal: number
  custoM2:     number
}

export interface SimuladorChapaResult {
  rows: SimuladorChapaRow[]
}

export interface SimuladorVendaRow {
  material: string
  nPedido:  string
  bloco:    number
  pc:       number
  qtde:     number
  un:       string
  preco:    number
  total:    number
  vendedor: string
  cliente:  string
}

export interface SimuladorVendasResult {
  rows: SimuladorVendaRow[]
}

export interface SimuladorResumo {
  sumCustoTotal:  number
  sumMetrosTotal: number
  sumPcBloco:     number
  maxDfixa:       number
  maxDvariavel:   number
  maxLucro:       number
  sumVendasTotal: number
  sumVendasPc:    number
  sumVendasQtde:  number
}

// ─── DRE ─────────────────────────────────────────────────────────────────────

export type DreModo = 'caixa' | 'competencia'

export interface DreFiltros {
  modo:     DreModo
  data_ini: string
  data_fim: string
}

export type DreTipo = 'A' | 'ST' | 'M' | 'E' | 'I' | 'DT' | 'R' | 'L'

export interface DreClienteRow {
  cliente: string
  valores: number[]
  total:   number
}

export interface DreContaRow {
  contab:    string
  descricao: string
  valores:   number[]
  total:     number
  clientes:  DreClienteRow[]
}

export interface DreLinha {
  cod:          number
  descricao:    string
  prefixo:      string
  tipo:         DreTipo
  valores:      number[]
  total:        number
  ehPercentual: boolean
  contas:       DreContaRow[]
}

export interface DreKpi {
  recebimento:       number
  lucro_bruto:       number
  lucro_bruto_pct:   number
  ebtida:            number
  ebtida_pct:        number
  resultado:         number
  resultado_pct:     number
  lucro_liquido:     number
  lucro_liquido_pct: number
}

export interface DreResult {
  periodos: number[]   // YYYYMM
  linhas:   DreLinha[]
  kpi:      DreKpi
}

export interface DreFiltrosDisponiveis {
  anos: number[]
}
