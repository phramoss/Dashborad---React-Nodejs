const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { addInFilter, addDateRange } = require('../utils/sqlFilters')

// ─── Helper: filtros para BI_ESTOQUE ─────────────────────────
function buildEstoqueFilters(qs) {
  const { empresa, cod_ma, bloco, esp_lq, industrializacao, situacao, data_ini, data_fim } = qs
  const where  = []
  const params = []

  addInFilter(where, params, 'EMPRESA',       empresa,         Number)
  addInFilter(where, params, 'COD_MA',        cod_ma,          Number)
  addInFilter(where, params, 'BLOCO',         bloco,           Number)
  addInFilter(where, params, 'SITUACAO',      situacao,        String)
  addInFilter(where, params, 'COMPOSICAO_MA', industrializacao, String)

  // Espessura: CAST(ESP_LQ AS INTEGER) IN (...)
  if (esp_lq !== undefined && esp_lq !== null && esp_lq !== '') {
    const raw  = Array.isArray(esp_lq) ? esp_lq : String(esp_lq).split(',')
    const esps = raw.map(e => Number(e.toString().trim())).filter(n => !isNaN(n) && n > 0)
    if (esps.length === 1) {
      where.push('CAST(ESP_LQ AS INTEGER) = ?')
      params.push(esps[0])
    } else if (esps.length > 1) {
      where.push(`CAST(ESP_LQ AS INTEGER) IN (${esps.map(() => '?').join(', ')})`)
      params.push(...esps)
    }
  }

  addDateRange(where, params, 'DATA_ENTRADA', data_ini, data_fim)

  return { where, params }
}

function toWhere(where, extra = []) {
  const all = [...extra, ...where]
  return all.length ? `WHERE ${all.join(' AND ')}` : ''
}

const ACTIVE_SITUACAO = `SITUACAO IN ('DISPONIVEL', 'RESERVADO', 'INACABADO')`

// ─── Filtros disponíveis ──────────────────────────────────────
router.get('/estoque/filtros', async (req, res, next) => {
  try {
    const [empresas, materiais, blocos, espessuras, composicoes] = await Promise.all([
      query(`
        SELECT DISTINCT EMPRESA
        FROM BI_ESTOQUE
        WHERE EMPRESA IS NOT NULL AND ${ACTIVE_SITUACAO}
        ORDER BY EMPRESA
      `),
      query(`
        SELECT DISTINCT COD_MA AS id, MATERIAL AS label
        FROM BI_ESTOQUE
        WHERE MATERIAL IS NOT NULL AND ${ACTIVE_SITUACAO}
        ORDER BY label
        ROWS 1 TO 500
      `),
      query(`
        SELECT DISTINCT BLOCO
        FROM BI_ESTOQUE
        WHERE BLOCO IS NOT NULL AND BLOCO > 0 AND ${ACTIVE_SITUACAO}
        ORDER BY BLOCO
        ROWS 1 TO 500
      `),
      query(`
        SELECT DISTINCT CAST(ESP_LQ AS INTEGER) AS esp
        FROM BI_ESTOQUE
        WHERE ESP_LQ IS NOT NULL AND ESP_LQ > 0 AND ${ACTIVE_SITUACAO}
        ORDER BY esp
      `),
      query(`
        SELECT DISTINCT COMPOSICAO_MA
        FROM BI_ESTOQUE
        WHERE COMPOSICAO_MA IS NOT NULL AND ${ACTIVE_SITUACAO}
        ORDER BY COMPOSICAO_MA
      `),
    ])

    const n = v => Number(v || 0)
    const s = v => String(v || '')

    res.json({
      empresas:    empresas.map(r => n(r.EMPRESA   || r.empresa)),
      materiais:   materiais.map(r => ({ id: n(r.ID || r.id), label: s(r.LABEL || r.label) })),
      blocos:      blocos.map(r => n(r.BLOCO       || r.bloco)),
      espessuras:  espessuras.map(r => n(r.ESP     || r.esp)).filter(e => e > 0),
      composicoes: composicoes.map(r => s(r.COMPOSICAO_MA || r.composicao_ma)).filter(Boolean),
    })
  } catch (err) { next(err) }
})

// ─── KPI ─────────────────────────────────────────────────────
router.get('/estoque/kpi', async (req, res, next) => {
  try {
    const { where, params } = buildEstoqueFilters(req.query)
    const extra = req.query.situacao ? [] : [ACTIVE_SITUACAO]
    const w     = toWhere(where, extra)

    const sql = `
      SELECT
        ROUND(SUM(TOTAL_CUSTO), 2)                                           AS custo_total,
        ROUND(SUM(CASE WHEN UNIDADE = 'M2' THEN QTDE   ELSE 0 END), 2)      AS total_m2,
        SUM(CASE WHEN UNIDADE = 'M2' THEN QTDE_PC ELSE 0 END)               AS qtd_m2,
        ROUND(SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE   ELSE 0 END), 2)      AS total_m3,
        SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE_PC ELSE 0 END)               AS qtd_m3,
        COUNT(DISTINCT CAVALETE)                                             AS cavaletes
      FROM BI_ESTOQUE ${w}
    `
    const rows = await query(sql, params)
    const r    = rows[0] || {}
    const n    = v => Number(v ?? 0)

    res.json({
      custoTotal: n(r.CUSTO_TOTAL ?? r.custo_total),
      totalM2:    n(r.TOTAL_M2   ?? r.total_m2),
      qtdM2:      n(r.QTD_M2    ?? r.qtd_m2),
      totalM3:    n(r.TOTAL_M3   ?? r.total_m3),
      qtdM3:      n(r.QTD_M3    ?? r.qtd_m3),
      cavaletes:  n(r.CAVALETES  ?? r.cavaletes),
    })
  } catch (err) { next(err) }
})

// ─── Tabela Chapa / Recortado (UNIDADE = 'M2') ───────────────
router.get('/estoque/chapa', async (req, res, next) => {
  try {
    const { where, params } = buildEstoqueFilters(req.query)
    const extra = [...(req.query.situacao ? [] : [ACTIVE_SITUACAO]), `UNIDADE = 'M2'`]
    const w     = toWhere(where, extra)

    const sql = `
      SELECT
        COD_MA,
        MATERIAL,
        ROUND(SUM(QTDE), 2)  AS metragem,
        SUM(QTDE_PC)         AS pc
      FROM BI_ESTOQUE ${w}
      GROUP BY COD_MA, MATERIAL
      ORDER BY metragem DESC
    `
    const rows = await query(sql, params)

    const total_met = rows.reduce((s, r) => s + Number(r.METRAGEM ?? r.metragem ?? 0), 0)
    const total_pc  = rows.reduce((s, r) => s + Number(r.PC       ?? r.pc       ?? 0), 0)

    res.json({
      rows: rows.map(r => ({
        codMa:    Number(r.COD_MA   ?? r.cod_ma   ?? 0),
        material: String(r.MATERIAL ?? r.material ?? ''),
        metragem: Number(r.METRAGEM ?? r.metragem ?? 0),
        pc:       Number(r.PC       ?? r.pc       ?? 0),
      })),
      totais: {
        metragem: Number(total_met.toFixed(2)),
        pc:       Math.round(total_pc),
      },
    })
  } catch (err) { next(err) }
})

// ─── Tabela Bloco (UNIDADE = 'M3') ───────────────────────────
router.get('/estoque/bloco', async (req, res, next) => {
  try {
    const { where, params } = buildEstoqueFilters(req.query)
    const extra = [...(req.query.situacao ? [] : [ACTIVE_SITUACAO]), `UNIDADE = 'M3'`]
    const w     = toWhere(where, extra)

    const sql = `
      SELECT
        COD_MA,
        MATERIAL,
        ROUND(SUM(QTDE), 2)  AS metragem,
        SUM(QTDE_PC)         AS pc
      FROM BI_ESTOQUE ${w}
      GROUP BY COD_MA, MATERIAL
      ORDER BY metragem DESC
    `
    const rows = await query(sql, params)

    const total_met = rows.reduce((s, r) => s + Number(r.METRAGEM ?? r.metragem ?? 0), 0)
    const total_pc  = rows.reduce((s, r) => s + Number(r.PC       ?? r.pc       ?? 0), 0)

    res.json({
      rows: rows.map(r => ({
        codMa:    Number(r.COD_MA   ?? r.cod_ma   ?? 0),
        material: String(r.MATERIAL ?? r.material ?? ''),
        metragem: Number(r.METRAGEM ?? r.metragem ?? 0),
        pc:       Number(r.PC       ?? r.pc       ?? 0),
      })),
      totais: {
        metragem: Number(total_met.toFixed(2)),
        pc:       Math.round(total_pc),
      },
    })
  } catch (err) { next(err) }
})

// ─── Matriz Estoque por Faturamento ──────────────────────────
router.get('/estoque/faturamento-matriz', async (req, res, next) => {
  try {
    const { where, params } = buildEstoqueFilters(req.query)
    const w = toWhere(where, [`DATA_VENDA IS NOT NULL`])

    const sql = `
      SELECT
        COD_MA,
        MATERIAL,
        EXTRACT(YEAR  FROM DATA_VENDA) AS ano,
        EXTRACT(MONTH FROM DATA_VENDA) AS mes,
        ROUND(SUM(QTDE), 2)            AS quantidade,
        ROUND(SUM(TOTAL_CUSTO), 2)     AS total
      FROM BI_ESTOQUE ${w}
      GROUP BY COD_MA, MATERIAL,
               EXTRACT(YEAR  FROM DATA_VENDA),
               EXTRACT(MONTH FROM DATA_VENDA)
      ORDER BY MATERIAL, ano, mes
    `
    const rows = await query(sql, params)

    res.json(rows.map(r => ({
      codMa:      Number(r.COD_MA     ?? r.cod_ma     ?? 0),
      material:   String(r.MATERIAL   ?? r.material   ?? ''),
      ano:        Number(r.ANO        ?? r.ano        ?? 0),
      mes:        Number(r.MES        ?? r.mes        ?? 0),
      quantidade: Number(r.QUANTIDADE ?? r.quantidade ?? 0),
      total:      Number(r.TOTAL      ?? r.total      ?? 0),
    })))
  } catch (err) { next(err) }
})

module.exports = router
