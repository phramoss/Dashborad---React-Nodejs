const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { addInFilter } = require('../utils/sqlFilters')

// ─── cache simples 30s ───────────────────────────────────────────────────────
const _cache = new Map()
function getCacheKey(prefix, qs) { return prefix + JSON.stringify(qs) }
function getCache(key) {
  const item = _cache.get(key)
  if (!item) return null
  if (Date.now() - item.ts > 30000) { _cache.delete(key); return null }
  return item.data
}
function setCache(key, data) { _cache.set(key, { data, ts: Date.now() }) }
function n(v) { const x = Number(v ?? 0); return isFinite(x) ? x : 0 }
function s(v) { return String(v ?? '') }
function toFirebirdDate(dateStr, endOfDay = false) {
  return endOfDay ? dateStr + ' 23:59:59' : dateStr
}

// ─── Layout DRE ──────────────────────────────────────────────────────────────
const DRE_LAYOUT = [
  { cod: 1,  descricao: 'RECEBIMENTO',                   prefixo: '( + )', tipo: 'A'  },
  { cod: 2,  descricao: 'DESPESAS FIXAS',                prefixo: '( - )', tipo: 'A'  },
  { cod: 3,  descricao: 'MARGEM DE CONTRIBUIÇÃO',        prefixo: '( % )', tipo: 'M'  },
  { cod: 4,  descricao: 'LUCRO BRUTO',                   prefixo: '( = )', tipo: 'ST' },
  { cod: 5,  descricao: 'DESPESAS VARIÁVEIS',            prefixo: '( - )', tipo: 'A'  },
  { cod: 6,  descricao: 'EBTIDA',                        prefixo: '( = )', tipo: 'ST' },
  { cod: 7,  descricao: 'EBTIDA (%)',                    prefixo: '( % )', tipo: 'E'  },
  { cod: 8,  descricao: 'IMPOSTOS',                      prefixo: '( - )', tipo: 'A'  },
  { cod: 9,  descricao: 'CARGA DE IMPOSTOS',             prefixo: '( % )', tipo: 'I'  },
  { cod: 10, descricao: 'DESPESAS TOTAIS',               prefixo: '( = )', tipo: 'DT' },
  { cod: 11, descricao: 'RESULTADO',                     prefixo: '( = )', tipo: 'ST' },
  { cod: 12, descricao: 'RESULTADO (%)',                 prefixo: '( % )', tipo: 'R'  },
  { cod: 13, descricao: 'MOV. FINANCEIRO / INVEST.',     prefixo: '( - )', tipo: 'A'  },
  { cod: 14, descricao: 'LUCRO LÍQUIDO',                 prefixo: '( = )', tipo: 'ST' },
  { cod: 15, descricao: 'LUCRO LÍQUIDO (%)',             prefixo: '( % )', tipo: 'L'  },
]

// ─── Construção da resposta DRE ───────────────────────────────────────────────
function buildDreResult(rows, periodos) {
  // Agrupa dados brutos
  const grupoPeriodos = {} // { [cod]: { [periodo]: number } }
  const grupoContas   = {} // { [cod]: { [contab]: { nom, periodos: {}, clientes: {} } } }

  for (const row of rows) {
    const cod    = n(row.cod_grupo  ?? row.COD_GRUPO)
    const periodo = n(row.periodo   ?? row.PERIODO)
    const valor  = n(row.valor      ?? row.VALOR)
    const contab = s(row.contab_cta ?? row.CONTAB_CTA)
    const nom    = s(row.nom_cta    ?? row.NOM_CTA)
    const cli    = s(row.cliente    ?? row.CLIENTE)

    // Apenas grupos do tipo 'A' têm dados reais no banco
    if (!DRE_LAYOUT.find(l => l.cod === cod && l.tipo === 'A')) continue

    if (!grupoPeriodos[cod]) grupoPeriodos[cod] = {}
    grupoPeriodos[cod][periodo] = (grupoPeriodos[cod][periodo] ?? 0) + valor

    if (!grupoContas[cod]) grupoContas[cod] = {}
    if (!grupoContas[cod][contab]) grupoContas[cod][contab] = { nom, periodos: {}, clientes: {} }
    const ce = grupoContas[cod][contab]
    ce.periodos[periodo] = (ce.periodos[periodo] ?? 0) + valor
    if (!ce.clientes[cli]) ce.clientes[cli] = {}
    ce.clientes[cli][periodo] = (ce.clientes[cli][periodo] ?? 0) + valor
  }

  function aVal(cod, p)  { return grupoPeriodos[cod]?.[p] ?? 0 }
  function stVal(cod, p) {
    return DRE_LAYOUT
      .filter(l => l.tipo === 'A' && l.cod < cod)
      .reduce((sum, l) => sum + aVal(l.cod, p), 0)
  }
  function aTotal(cod)  { return periodos.reduce((s, p) => s + aVal(cod, p), 0) }
  function stTotal(cod) { return periodos.reduce((s, p) => s + stVal(cod, p), 0) }

  const linhas = DRE_LAYOUT.map(layout => {
    const { cod, tipo } = layout
    let valores
    let ehPercentual = false
    let contas = []

    if (tipo === 'A') {
      valores = periodos.map(p => aVal(cod, p))

      contas = Object.entries(grupoContas[cod] ?? {})
        .map(([contab, cData]) => {
          const cVals = periodos.map(p => cData.periodos[p] ?? 0)
          const clientes = Object.entries(cData.clientes)
            .map(([cliente, clP]) => {
              const clVals = periodos.map(p => clP[p] ?? 0)
              return { cliente, valores: clVals, total: clVals.reduce((a, b) => a + b, 0) }
            })
            .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
            .slice(0, 100)
          return {
            contab,
            descricao: cData.nom,
            valores: cVals,
            total: cVals.reduce((a, b) => a + b, 0),
            clientes,
          }
        })
        .sort((a, b) => a.contab.localeCompare(b.contab))

    } else if (tipo === 'ST') {
      valores = periodos.map(p => stVal(cod, p))

    } else if (tipo === 'M') {
      // Margem = LUCRO_BRUTO / RECEBIMENTO
      valores = periodos.map(p => { const r = aVal(1, p); return r ? stVal(4, p) / r * 100 : 0 })
      ehPercentual = true

    } else if (tipo === 'E') {
      // EBTIDA %
      valores = periodos.map(p => { const r = aVal(1, p); return r ? stVal(6, p) / r * 100 : 0 })
      ehPercentual = true

    } else if (tipo === 'I') {
      // Carga impostos %
      valores = periodos.map(p => { const r = aVal(1, p); return r ? aVal(8, p) / r * 100 : 0 })
      ehPercentual = true

    } else if (tipo === 'DT') {
      // Despesas totais = -(fixas + variáveis + impostos) — exibido como positivo
      valores = periodos.map(p => -(aVal(2, p) + aVal(5, p) + aVal(8, p)))

    } else if (tipo === 'R') {
      // Resultado %
      valores = periodos.map(p => { const r = aVal(1, p); return r ? stVal(11, p) / r * 100 : 0 })
      ehPercentual = true

    } else if (tipo === 'L') {
      // Lucro líquido %
      valores = periodos.map(p => { const r = aVal(1, p); return r ? stVal(14, p) / r * 100 : 0 })
      ehPercentual = true

    } else {
      valores = periodos.map(() => 0)
    }

    let total
    if (!ehPercentual) {
      total = valores.reduce((a, b) => a + b, 0)
    } else {
      const totRec = aTotal(1)
      if (totRec === 0) { total = 0 }
      else if (tipo === 'M') total = stTotal(4) / totRec * 100
      else if (tipo === 'E') total = stTotal(6) / totRec * 100
      else if (tipo === 'I') total = aTotal(8)  / totRec * 100
      else if (tipo === 'R') total = stTotal(11) / totRec * 100
      else if (tipo === 'L') total = stTotal(14) / totRec * 100
      else total = 0
    }

    return { ...layout, valores, total, ehPercentual, contas }
  })

  const totRec = aTotal(1)
  const kpi = {
    recebimento:       totRec,
    lucro_bruto:       stTotal(4),
    lucro_bruto_pct:   totRec ? stTotal(4)  / totRec : 0,
    ebtida:            stTotal(6),
    ebtida_pct:        totRec ? stTotal(6)  / totRec : 0,
    resultado:         stTotal(11),
    resultado_pct:     totRec ? stTotal(11) / totRec : 0,
    lucro_liquido:     stTotal(14),
    lucro_liquido_pct: totRec ? stTotal(14) / totRec : 0,
  }

  return { periodos, linhas, kpi }
}

// ─── GET /api/dre ─────────────────────────────────────────────────────────────
router.get('/dre', async (req, res, next) => {
  const cacheKey = getCacheKey('dre', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { modo = 'caixa', data_ini, data_fim, estab } = req.query

    const campoData = String(modo).toLowerCase() === 'competencia'
      ? 'VRESULTADO.DTEMISS_FAT'
      : 'VRESULTADO.DTPAGTO_FAT'

    const where  = [`VRESULTADO.PRINT_FAT = 'S'`]
    const params = []

    if (data_ini) {
      where.push(`${campoData} >= ?`)
      params.push(toFirebirdDate(data_ini))
    }
    if (data_fim) {
      where.push(`${campoData} <= ?`)
      params.push(toFirebirdDate(data_fim, true))
    }

    addInFilter(where, params, 'VRESULTADO.COD_ESTAB', estab, Number)

    const whereClause = `WHERE ${where.join(' AND ')}`

    const sql = `
      SELECT
        CAST(SUBSTRING(CONTA.GRUPO_DFC FROM 1 FOR 2) AS INTEGER)                    AS COD_GRUPO,
        CONTA.CONTAB_CTA,
        CONTA.NOM_CTA,
        COALESCE(VRESULTADO.NOM_PESS, 'SEM CLIENTE/FORNECEDOR')                     AS CLIENTE,
        EXTRACT(YEAR FROM ${campoData}) * 100 + EXTRACT(MONTH FROM ${campoData})    AS PERIODO,
        SUM(VRESULTADO.TOTALCONVERTIDO)                                              AS VALOR
      FROM VRESULTADO
      INNER JOIN CONTA ON VRESULTADO.COD_CTA = CONTA.COD_CTA
      ${whereClause}
        AND CONTA.GRUPO_DFC IS NOT NULL
        AND TRIM(CONTA.GRUPO_DFC) <> ''
        AND ${campoData} IS NOT NULL
      GROUP BY
        CAST(SUBSTRING(CONTA.GRUPO_DFC FROM 1 FOR 2) AS INTEGER),
        CONTA.CONTAB_CTA,
        CONTA.NOM_CTA,
        COALESCE(VRESULTADO.NOM_PESS, 'SEM CLIENTE/FORNECEDOR'),
        EXTRACT(YEAR FROM ${campoData}) * 100 + EXTRACT(MONTH FROM ${campoData})
      ORDER BY 1, 2, 3, 5
    `

    const rows = await query(sql, params)

    // Monta lista de períodos presentes nos dados
    const periodSet = new Set()
    for (const row of rows) periodSet.add(n(row.periodo ?? row.PERIODO))
    const periodos = Array.from(periodSet).sort((a, b) => a - b)

    const result = buildDreResult(rows, periodos)
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

// ─── GET /api/dre/filtros ─────────────────────────────────────────────────────
router.get('/dre/filtros', async (req, res, next) => {
  const cached = getCache('dre-filtros')
  if (cached) return res.json(cached)
  try {
    const sql = `
      SELECT DISTINCT EXTRACT(YEAR FROM DTPAGTO_FAT) AS ANO
      FROM VRESULTADO
      INNER JOIN CONTA ON VRESULTADO.COD_CTA = CONTA.COD_CTA
      WHERE VRESULTADO.PRINT_FAT = 'S'
        AND VRESULTADO.DTPAGTO_FAT IS NOT NULL
        AND CONTA.GRUPO_DFC IS NOT NULL
        AND TRIM(CONTA.GRUPO_DFC) <> ''
      ORDER BY 1 DESC
    `
    const rows = await query(sql)
    const anos = rows.map(r => n(r.ano ?? r.ANO)).filter(a => a > 0)
    const result = { anos }
    setCache('dre-filtros', result)
    res.json(result)
  } catch (err) { next(err) }
})

module.exports = router
