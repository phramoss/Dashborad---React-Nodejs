import type { SimuladorResumo } from '@/types'

export const DEFAULT_VAR_LUCRO = 0.30

export const safe = (n: number | null | undefined): number =>
  (n === null || n === undefined || !isFinite(n) || isNaN(n)) ? 0 : n

export const safeDivide = (num: number, den: number): number =>
  den !== 0 ? num / den : 0

export interface SimuladorCalcs {
  pcRestante:    number
  pdrPrecoM2:    number
  pdrFaturado:   number
  pdrLucro:      number
  qtdeEstq:      number | 'S/ ESTOQUE'
  precoSemLucro: number
  precoAplicar:  number
  lucroVariavel: number
  precoVendaVar: number | 'S/ESTOQUE'
}

export function calcSimulador(
  r: SimuladorResumo,
  varLucro: number,
  dvariavel?: number,
  dfixa?: number,
): SimuladorCalcs {
  const {
    sumCustoTotal, sumMetrosTotal, sumPcBloco,
    maxDfixa: _maxDfixa, maxDvariavel: _maxDvariavel, maxLucro,
    sumVendasTotal, sumVendasPc, sumVendasQtde,
  } = r
  const maxDfixa     = dfixa     !== undefined ? dfixa     : _maxDfixa
  const maxDvariavel = dvariavel !== undefined ? dvariavel : _maxDvariavel

  const pcRestante = sumPcBloco - sumVendasPc

  const denPdr      = 1 - (maxDvariavel + maxDfixa + maxLucro)
  const pdrPrecoM2  = denPdr !== 0 && sumMetrosTotal !== 0
    ? safeDivide(sumCustoTotal / denPdr, sumMetrosTotal) : 0
  const pdrFaturado = pdrPrecoM2 * sumMetrosTotal
  const pdrLucro    = denPdr !== 0 ? (sumCustoTotal / denPdr) * maxLucro : 0

  const qtdeEstq: number | 'S/ ESTOQUE' =
    sumVendasPc > sumPcBloco
      ? sumVendasQtde - sumMetrosTotal
      : sumPcBloco > sumVendasPc
        ? sumMetrosTotal - sumVendasQtde
        : 'S/ ESTOQUE'

  const denSemLucro   = 1 - (maxDfixa + maxDvariavel)
  const precoSemLucro = denSemLucro !== 0 && sumMetrosTotal !== 0
    ? safeDivide(sumCustoTotal / denSemLucro, sumMetrosTotal) : 0

  const totalFatSistema = denPdr !== 0 ? sumCustoTotal / denPdr : 0

  const precoAplicar = (() => {
    if (sumVendasPc === sumPcBloco) return 0
    if (sumVendasTotal > totalFatSistema) return pdrPrecoM2
    const denApl      = sumMetrosTotal - sumVendasQtde
    const denAplLucro = 1 - (maxDfixa + maxDvariavel + maxLucro)
    return denApl !== 0 && denAplLucro !== 0
      ? safeDivide((sumCustoTotal / denAplLucro) - sumVendasTotal, denApl) : 0
  })()

  const denVar    = 1 - (maxDfixa + maxDvariavel + varLucro)
  const denVarFat = denVar !== 0 ? sumCustoTotal / denVar : 0

  const precoAplicarVar = (() => {
    if (sumVendasPc === sumPcBloco) return 0
    if (sumVendasTotal > totalFatSistema) return pdrPrecoM2
    const denApl = sumMetrosTotal - sumVendasQtde
    return denApl !== 0 && denVar !== 0
      ? safeDivide(denVarFat - sumVendasTotal, denApl) : 0
  })()

  const qtdeEstqNum    = qtdeEstq === 'S/ ESTOQUE' ? 0 : safe(qtdeEstq)
  const lucroVariavel  = (() => {
    if (pcRestante === 0)       return sumVendasTotal - sumCustoTotal
    if (precoAplicarVar === 0)  return sumVendasTotal - sumCustoTotal
    return (sumVendasTotal + (precoAplicarVar * qtdeEstqNum)) - sumCustoTotal
  })()

  const precoVendaVar: number | 'S/ESTOQUE' = (() => {
    if (pcRestante === 0) return 'S/ESTOQUE'
    const denApl = sumMetrosTotal - sumVendasQtde
    if (denApl === 0) return precoSemLucro
    const candidato = denVar !== 0
      ? safeDivide(denVarFat - sumVendasTotal, denApl) : 0
    return candidato < precoSemLucro ? precoSemLucro : candidato
  })()

  return {
    pcRestante,
    pdrPrecoM2:   safe(pdrPrecoM2),
    pdrFaturado:  safe(pdrFaturado),
    pdrLucro:     safe(pdrLucro),
    qtdeEstq,
    precoSemLucro: safe(precoSemLucro),
    precoAplicar:  safe(precoAplicar),
    lucroVariavel: safe(lucroVariavel),
    precoVendaVar: precoVendaVar === 'S/ESTOQUE' ? 'S/ESTOQUE' : safe(precoVendaVar),
  }
}

export interface PedidoItem {
  chapaKey:    string
  nBloco:      number
  chapa:       number
  codMa:       number
  material:    string
  pc:          number
  metrosTotal: number
  custoTotal:  number
  custoM2:     number
  qtde:        number
  desconto:    number
}

export function calcPedidoItem(
  item: PedidoItem,
  dfixa: number,
  dvariavel: number,
  varLucro: number,
) {
  const den0 = 1 - dfixa - dvariavel
  const denV = 1 - dfixa - dvariavel - varLucro
  const precoSemLucroM2     = den0 !== 0 ? item.custoM2 / den0 : 0
  const precoComLucroM2     = denV !== 0 ? item.custoM2 / denV : 0
  const valorBruto          = precoComLucroM2 * item.qtde
  const valorTotal          = valorBruto - item.desconto
  const custoQtde           = item.custoM2 * item.qtde
  const lucro               = valorTotal - custoQtde
  const descontoPct         = valorBruto > 0 ? (item.desconto / valorBruto) * 100 : 0
  const precoComLucroM2Final = item.qtde > 0 ? valorTotal / item.qtde : 0
  const lucroFinalPct       = valorTotal > 0
    ? ((varLucro * valorBruto - item.desconto) / valorTotal) * 100 : 0
  return {
    precoSemLucroM2:      safe(precoSemLucroM2),
    precoComLucroM2:      safe(precoComLucroM2),
    precoComLucroM2Final: safe(precoComLucroM2Final),
    valorBruto:           safe(valorBruto),
    valorTotal:           safe(valorTotal),
    lucro:                safe(lucro),
    lucroFinalPct:        safe(lucroFinalPct),
    descontoPct:          safe(descontoPct),
  }
}
