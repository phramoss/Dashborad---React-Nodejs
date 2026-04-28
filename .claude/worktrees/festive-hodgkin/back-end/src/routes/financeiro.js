const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { addInFilter, addDateRange } = require('../utils/sqlFilters')

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

function buildWhere(qs) {
  const { moeda, empresa, cod_cliente, venc_ini, venc_fim, emis_ini, emis_fim } = qs
  const where = []
  const params = []
  addInFilter(where, params, 'MOEDA',       moeda,       String)
  addInFilter(where, params, 'EMPRESA',     empresa,     Number)
  addInFilter(where, params, 'COD_CLIENTE', cod_cliente, Number)
  addDateRange(where, params, 'VENCIMENTO', venc_ini, venc_fim)
  addDateRange(where, params, 'EMISSAO',    emis_ini, emis_fim)
  return { where, params }
}

// ─── KPIs: A Receber e A Pagar em aberto ─────────────────────────────────────
router.get('/financeiro/kpi', async (req, res, next) => {
  const cacheKey = getCacheKey('fin-kpi', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const { where, params } = buildWhere(req.query)
    const w = where.length ? `AND ${where.join(' AND ')}` : ''
    const sql = `
      SELECT
        SUM(CASE WHEN MOVIMENTO = 'A RECEBER' AND SITUACAO = 'ABERTO' THEN VALOR_ABERTO ELSE 0 END) AS a_receber,
        SUM(CASE WHEN MOVIMENTO = 'A PAGAR'   AND SITUACAO = 'ABERTO' THEN VALOR_ABERTO ELSE 0 END) AS a_pagar
      FROM BI_FINANCEIRO
      WHERE 1=1 ${w}
    `
    const rows = await query(sql, params)
    const r = rows[0] || {}
    const result = {
      aReceber: n(r.A_RECEBER ?? r.a_receber),
      aPagar:   n(r.A_PAGAR   ?? r.a_pagar),
    }
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

// ─── A Receber agrupado (cliente | vendedor | cobrança) ───────────────────────
router.get('/financeiro/a-receber', async (req, res, next) => {
  const cacheKey = getCacheKey('fin-receber', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const { agrupar = 'cliente', limit = '15' } = req.query
    const lim = Math.min(50, Math.max(1, Number(limit)))
    const { where, params } = buildWhere(req.query)
    const w = where.length ? `AND ${where.join(' AND ')}` : ''

    const campoMap = {
      cliente:  { campo: 'NOME_PESSOA', label: 'cliente'  },
      vendedor: { campo: 'VENDEDOR',    label: 'vendedor' },
      cobranca: { campo: 'COBRANCA',    label: 'cobranca' },
    }
    const cfg = campoMap[agrupar] ?? campoMap.cliente

    const sql = `
      SELECT FIRST ${lim}
        ${cfg.campo} AS label,
        SUM(VALOR_ABERTO) AS total
      FROM BI_FINANCEIRO
      WHERE MOVIMENTO = 'A RECEBER' AND SITUACAO = 'ABERTO' ${w}
        AND ${cfg.campo} IS NOT NULL AND TRIM(${cfg.campo}) <> ''
      GROUP BY ${cfg.campo}
      ORDER BY total DESC
    `
    const rows = await query(sql, params)
    const result = rows.map(r => ({
      label: s(r.LABEL ?? r.label),
      total: n(r.TOTAL ?? r.total),
    }))
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

// ─── A Pagar agrupado (cobrança | fornecedor) ─────────────────────────────────
router.get('/financeiro/a-pagar', async (req, res, next) => {
  const cacheKey = getCacheKey('fin-pagar', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const { agrupar = 'cobranca', limit = '15' } = req.query
    const lim = Math.min(50, Math.max(1, Number(limit)))
    const { where, params } = buildWhere(req.query)
    const w = where.length ? `AND ${where.join(' AND ')}` : ''

    const campoMap = {
      cobranca:   { campo: 'COBRANCA',    label: 'cobranca'   },
      fornecedor: { campo: 'NOME_PESSOA', label: 'fornecedor' },
    }
    const cfg = campoMap[agrupar] ?? campoMap.cobranca

    const sql = `
      SELECT FIRST ${lim}
        ${cfg.campo} AS label,
        SUM(VALOR_ABERTO) AS total
      FROM BI_FINANCEIRO
      WHERE MOVIMENTO = 'A PAGAR' AND SITUACAO = 'ABERTO' ${w}
        AND ${cfg.campo} IS NOT NULL AND TRIM(${cfg.campo}) <> ''
      GROUP BY ${cfg.campo}
      ORDER BY total DESC
    `
    const rows = await query(sql, params)
    const result = rows.map(r => ({
      label: s(r.LABEL ?? r.label),
      total: n(r.TOTAL ?? r.total),
    }))
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

// ─── Movimento Semanal ────────────────────────────────────────────────────────
router.get('/financeiro/movimento-semanal', async (req, res, next) => {
  const cacheKey = getCacheKey('fin-semanal', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const { where, params } = buildWhere(req.query)
    const w = where.length ? `AND ${where.join(' AND ')}` : ''
    const sql = `
      SELECT
        CAST(VENCIMENTO AS DATE)                                              AS dia,
        SUM(CASE WHEN MOVIMENTO = 'A RECEBER' THEN VALOR_ABERTO ELSE 0 END) AS a_receber,
        SUM(CASE WHEN MOVIMENTO = 'A PAGAR'   THEN VALOR_ABERTO ELSE 0 END) AS a_pagar
      FROM BI_FINANCEIRO
      WHERE CAST(VENCIMENTO AS DATE) BETWEEN CAST(CURRENT_DATE - 3 AS DATE)
                                         AND CAST(CURRENT_DATE + 3 AS DATE)
        ${w}
      GROUP BY CAST(VENCIMENTO AS DATE)
      ORDER BY dia
    `
    const rows = await query(sql, params)
    const result = rows.map(r => ({
      dia:      s(r.DIA ?? r.dia).slice(0, 10),
      aReceber: n(r.A_RECEBER ?? r.a_receber),
      aPagar:   n(r.A_PAGAR   ?? r.a_pagar),
    }))
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

// ─── Saldo Bancário ───────────────────────────────────────────────────────────
router.get('/financeiro/saldo-bancario', async (req, res, next) => {
  const cacheKey = 'fin-saldo-bancario'
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const sql = `
      SELECT
        CONTA.COD_CTA,
        CONTA.NOM_CTA,
        SUM(
          CAIXA.TOTAL_CX *
          CASE
            WHEN CONTA.COD_CTA = CAIXA.D_COD_CTA THEN
              CASE WHEN CAIXA.OKD_CX = 'S' THEN 1 ELSE 0 END
            ELSE
              CASE WHEN CAIXA.OKC_CX = 'S' THEN -1 ELSE 0 END
          END
        ) AS saldo_final,
        SUM(
          CASE WHEN CAIXA.DATA_CX < CAST(EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
            LPAD(CAST(EXTRACT(MONTH FROM CURRENT_DATE) AS VARCHAR(2)), 2, '0') || '-01' AS DATE)
          THEN
            CAIXA.TOTAL_CX *
            CASE
              WHEN CONTA.COD_CTA = CAIXA.D_COD_CTA THEN
                CASE WHEN CAIXA.OKD_CX = 'S' THEN 1 ELSE 0 END
              ELSE
                CASE WHEN CAIXA.OKC_CX = 'S' THEN -1 ELSE 0 END
            END
          ELSE 0 END
        ) AS saldo_inicial
      FROM VCAIXA CAIXA
      INNER JOIN CONTA ON CONTA.COD_CTA IN (CAIXA.D_COD_CTA, CAIXA.C_COD_CTA)
      WHERE
        CONTA.NAT_CTA = 'I'
        AND COALESCE(CONTA.SIT_CTA, 'A') = 'A'
        AND CONTA.CONTRL_CTA IN ('BANCO', 'CAIXA')
        AND CAIXA.OKD_CX <> 'D'
        AND CAIXA.OKC_CX <> 'D'
        AND CAIXA.COD_MD = 0
        AND CAIXA.DATA_CX BETWEEN '2015-01-01 00:00:00' AND CURRENT_TIMESTAMP
        AND CONTA.COD_CTA <> 324
      GROUP BY CONTA.COD_CTA, CONTA.NOM_CTA
      ORDER BY CONTA.NOM_CTA
    `
    const rows = await query(sql)
    const result = rows.map(r => ({
      codConta:     n(r.COD_CTA       ?? r.cod_cta),
      nomeConta:    s(r.NOM_CTA       ?? r.nom_cta),
      saldoInicial: n(r.SALDO_INICIAL ?? r.saldo_inicial),
      saldoFinal:   n(r.SALDO_FINAL   ?? r.saldo_final),
    }))
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

// ─── Fluxo de Caixa Futuro ────────────────────────────────────────────────────
router.get('/financeiro/fluxo-caixa', async (req, res, next) => {
  const cacheKey = getCacheKey('fin-fluxo', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const { where, params } = buildWhere(req.query)
    const w = where.length ? `AND ${where.join(' AND ')}` : ''

    const sqlPassado = `
      SELECT
        EXTRACT(YEAR FROM CAIXA.DATA_CX) * 100 + EXTRACT(MONTH FROM CAIXA.DATA_CX) AS periodo,
        SUM(
          CAIXA.TOTAL_CX *
          CASE
            WHEN CONTA.COD_CTA = CAIXA.D_COD_CTA THEN
              CASE WHEN CAIXA.OKD_CX = 'S' THEN 1 ELSE 0 END
            ELSE
              CASE WHEN CAIXA.OKC_CX = 'S' THEN -1 ELSE 0 END
          END
        ) AS total
      FROM VCAIXA CAIXA
      INNER JOIN CONTA ON CONTA.COD_CTA IN (CAIXA.D_COD_CTA, CAIXA.C_COD_CTA)
      WHERE
        CONTA.NAT_CTA = 'I'
        AND COALESCE(CONTA.SIT_CTA, 'A') = 'A'
        AND CONTA.CONTRL_CTA IN ('BANCO', 'CAIXA')
        AND CAIXA.OKD_CX <> 'D'
        AND CAIXA.OKC_CX <> 'D'
        AND CAIXA.COD_MD = 0
        AND CAIXA.DATA_CX BETWEEN '2015-01-01' AND CURRENT_TIMESTAMP
        AND CONTA.COD_CTA <> 324
      GROUP BY EXTRACT(YEAR FROM CAIXA.DATA_CX) * 100 + EXTRACT(MONTH FROM CAIXA.DATA_CX)
      ORDER BY periodo
    `

    const sqlFuturo = `
      SELECT
        EXTRACT(YEAR FROM VENCIMENTO) * 100 + EXTRACT(MONTH FROM VENCIMENTO) AS periodo,
        SUM(CASE WHEN MOVIMENTO = 'A RECEBER' THEN VALOR_ABERTO ELSE 0 END) AS a_receber,
        SUM(CASE WHEN MOVIMENTO = 'A PAGAR'   THEN VALOR_ABERTO ELSE 0 END) AS a_pagar
      FROM BI_FINANCEIRO
      WHERE SITUACAO = 'ABERTO'
        AND CAST(VENCIMENTO AS DATE) >= CURRENT_DATE
        ${w}
      GROUP BY EXTRACT(YEAR FROM VENCIMENTO) * 100 + EXTRACT(MONTH FROM VENCIMENTO)
      ORDER BY periodo
    `

    const [passadoRows, futuroRows] = await Promise.all([
      query(sqlPassado),
      query(sqlFuturo, params),
    ])

    let saldoAcum = 0
    const passado = passadoRows.map(r => {
      saldoAcum += n(r.TOTAL ?? r.total)
      return { periodo: n(r.PERIODO ?? r.periodo), saldo: saldoAcum }
    })
    const saldoBase = saldoAcum

    let saldoFuturo = saldoBase
    const futuro = futuroRows.map(r => {
      saldoFuturo += n(r.A_RECEBER ?? r.a_receber) - n(r.A_PAGAR ?? r.a_pagar)
      return {
        periodo:  n(r.PERIODO  ?? r.periodo),
        aReceber: n(r.A_RECEBER ?? r.a_receber),
        aPagar:   n(r.A_PAGAR   ?? r.a_pagar),
        saldo:    saldoFuturo,
      }
    })

    setCache(cacheKey, { passado, futuro, saldoAtual: saldoBase })
    res.json({ passado, futuro, saldoAtual: saldoBase })
  } catch (err) { next(err) }
})

// ─── Filtros disponíveis ──────────────────────────────────────────────────────
router.get('/financeiro/filtros', async (req, res, next) => {
  const cached = getCache('fin-filtros')
  if (cached) return res.json(cached)
  try {
    const [moedasRows, empresasRows, clientesRows] = await Promise.all([
      query(`SELECT DISTINCT MOEDA FROM BI_FINANCEIRO WHERE MOEDA IS NOT NULL ORDER BY 1`),
      query(`SELECT DISTINCT EMPRESA, NOME_EMPRES FROM BI_FINANCEIRO WHERE EMPRESA IS NOT NULL ORDER BY 1`),
      query(`SELECT DISTINCT COD_CLIENTE, NOME_PESSOA FROM BI_FINANCEIRO WHERE COD_CLIENTE IS NOT NULL ORDER BY 2 ROWS 1 TO 500`),
    ])
    const result = {
      moedas:   moedasRows.map(r => s(r.MOEDA ?? r.moeda)),
      empresas: empresasRows.map(r => ({ id: n(r.EMPRESA ?? r.empresa), label: s(r.NOME_EMPRES ?? r.nome_empres) })),
      clientes: clientesRows.map(r => ({ id: n(r.COD_CLIENTE ?? r.cod_cliente), label: s(r.NOME_PESSOA ?? r.nome_pessoa) })),
    }
    setCache('fin-filtros', result)
    res.json(result)
  } catch (err) { next(err) }
})

module.exports = router
