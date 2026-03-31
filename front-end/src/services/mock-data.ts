import type { DashboardData, FaturamentoPeriodo } from '@/types'

export const MOCK_DASHBOARD_DATA: DashboardData = {
  kpi: {
    faturamento: 90_850_000,
    faturamentoAnterior: 86_370_000,
    variacaoFaturamento: 5.19,
    totalM2: 93_760_000,
    qtdM2: 15703,
    totalM3: 195.08,
    qtdM3: 26,
    ticketMedio: 121_950_000,
    numeroPedidos: 745,
    pedidosExterior: 437,
    pedidosInterno: 308,
  },
  faturamentoPeriodo: [
    { periodo: '2021', faturamento: 12_610_000, variacaoMesAnterior: null, variacaoPercentual: null },
    { periodo: '2022', faturamento: 43_850_000, variacaoMesAnterior: null, variacaoPercentual: null },
    { periodo: '2023', faturamento: 29_900_000, variacaoMesAnterior: null, variacaoPercentual: null },
    { periodo: '2024', faturamento: 4_480_000,  variacaoMesAnterior: null, variacaoPercentual: null },
  ],
  faturamentoCliente: [
    { clienteId: 1,  clienteNome: 'ANS DISTRIBUIDORA',    faturamento: 6_208_970 },
    { clienteId: 2,  clienteNome: 'AGM IMPORTS',          faturamento: 5_443_600 },
    { clienteId: 3,  clienteNome: 'COLD SPRING GRANITE',  faturamento: 3_425_380 },
    { clienteId: 4,  clienteNome: 'PYRAMID MARBLE',       faturamento: 3_144_550 },
    { clienteId: 5,  clienteNome: 'TRITON STONE',         faturamento: 3_008_230 },
    { clienteId: 6,  clienteNome: 'THE STONE CO',         faturamento: 2_782_220 },
    { clienteId: 7,  clienteNome: 'OPUSTONE STONE',       faturamento: 2_777_570 },
    { clienteId: 8,  clienteNome: 'UNITED MATERIALS',     faturamento: 2_526_490 },
    { clienteId: 9,  clienteNome: 'STONE MART',           faturamento: 2_403_360 },
    { clienteId: 10, clienteNome: 'ENCORE STONE',         faturamento: 2_307_660 },
  ],
  faturamentoMaterial: [
    { materialId: 1,  materialNome: 'MARMORE BRANCO',      faturamento: 9_800_000 },
    { materialId: 2,  materialNome: 'QUARTZITO BRANCO A',  faturamento: 9_400_000 },
    { materialId: 3,  materialNome: 'QUARTZITO BRANCO B',  faturamento: 8_800_000 },
    { materialId: 4,  materialNome: 'QUARTZITO BRANCO C',  faturamento: 6_300_000 },
    { materialId: 5,  materialNome: 'QUARTZITO GREEN',     faturamento: 5_800_000 },
    { materialId: 6,  materialNome: 'QUARTZITO LILAS',     faturamento: 4_900_000 },
    { materialId: 7,  materialNome: 'QUARTZITO MARROM',    faturamento: 4_300_000 },
    { materialId: 8,  materialNome: 'QUARTZITO CINZA F',   faturamento: 3_900_000 },
    { materialId: 9,  materialNome: 'QUARTZITO AZUL',      faturamento: 2_700_000 },
    { materialId: 10, materialNome: 'QUARTZITO CINZA E',   faturamento: 2_400_000 },
  ],
  faturamentoGrupo: [
    { grupoId: 1, grupoNome: 'CHAPA',      faturamento: 89_303_730 },
    { grupoId: 2, grupoNome: 'BLOCO',      faturamento: 1_061_948 },
    { grupoId: 3, grupoNome: 'BANHEIRA',   faturamento: 441_766 },
    { grupoId: 4, grupoNome: 'RECORTADO',  faturamento: 25_910 },
    { grupoId: 5, grupoNome: 'AMOSTRA',    faturamento: 15_983 },
    { grupoId: 6, grupoNome: 'USO E CONS', faturamento: 41 },
  ],
  faturamentoVendedor: [
    { vendedorId: 1, vendedorNome: 'JULIANO SANTOS',    faturamento: 55_450_160 },
    { vendedorId: 2, vendedorNome: 'LAILA GIESTA',      faturamento: 15_038_820 },
    { vendedorId: 3, vendedorNome: 'RENATO FERREIRA',   faturamento: 5_869_200 },
    { vendedorId: 4, vendedorNome: 'CATIA REGINA',      faturamento: 5_681_400 },
    { vendedorId: 5, vendedorNome: 'DIEGO HERNANDEZ',   faturamento: 2_391_180 },
    { vendedorId: 6, vendedorNome: 'GMC REPRES',        faturamento: 548_100 },
    { vendedorId: 7, vendedorNome: 'ARIANE GOLÇALVES',  faturamento: 263_840 },
  ],
}

// ─── Mock mensal por ano (drill-down) ────────────────────────
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function makeMeses(base: number, seed: number): FaturamentoPeriodo[] {
  return MESES.map((m, i) => {
    const noise = Math.sin(i * seed + seed) * 0.35
    const faturamento = Math.max(0, Math.round(base * (1 + noise)))
    return { periodo: m, faturamento, variacaoMesAnterior: i === 0 ? null : noise * 100, variacaoPercentual: null }
  })
}

export const MOCK_MENSAL: Record<number, FaturamentoPeriodo[]> = {
  2021: makeMeses(1_050_000, 1.3),
  2022: makeMeses(3_650_000, 2.1),
  2023: makeMeses(2_490_000, 0.9),
  2024: makeMeses(1_120_000, 1.7),
}
