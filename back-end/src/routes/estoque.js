const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { addInFilter, addDateRange } = require('../utils/sqlFilters')

// ─── Helpers ─────────────────────────────────────────────────
function addStrInFilter(where, params, field, value) {
  if (value === undefined || value === null || value === '') return
  const raw  = Array.isArray(value) ? value : String(value).split(',')
  const vals = raw.map(v => v.toString().trim()).filter(v => v !== '')
  if (!vals.length) return
  if (vals.length === 1) {
    where.push(`${field} = ?`)
    params.push(vals[0])
  } else {
    where.push(`${field} IN (${vals.map(() => '?').join(', ')})`)
    params.push(...vals)
  }
}

function toWhere(where, extra = []) {
  const all = [...extra, ...where]
  return all.length ? `WHERE ${all.join(' AND ')}` : ''
}

const ACTIVE_SITUACAO = `SITUACAO IN ('DISPONIVEL', 'RESERVADO', 'INACABADO')`
const STOCK_SITUACAO  = `SITUACAO IN ('DISPONIVEL', 'RESERVADO')`

// ─── Filtros de estoque (chapa/bloco/kpi) — sem período ──────
function buildEstoqueFilters(qs) {
  const { empresa, cod_ma, bloco, esp_lq, industrializacao, situacao } = qs
  const where  = []
  const params = []

  addInFilter(where, params, 'EMPRESA',       empresa,         Number)
  addInFilter(where, params, 'COD_MA',        cod_ma,          Number)
  addInFilter(where, params, 'BLOCO',         bloco,           Number)
  addInFilter(where, params, 'SITUACAO',      situacao,        String)
  addStrInFilter(where, params, 'COMPOSICAO_MA', industrializacao)

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

  return { where, params }
}

// ─── Filtros de faturamento (BI_FATURAMENTO) — com período ───
function buildFatFilters(qs) {
  const { empresa, cod_ma, data_ini, data_fim } = qs
  const where  = []
  const params = []

  addInFilter(where, params, 'COD_ESTAB', empresa, Number)
  addInFilter(where, params, 'COD_MA',    cod_ma,  Number)
  addDateRange(where, params, 'DATA_EMISAO', data_ini, data_fim)

  return { where, params }
}

// ─── Filtros disponíveis ──────────────────────────────────────
router.get('/estoque/filtros', async (req, res, next) => {
  try {
    const [empresas, materiais, blocos, espessuras, composicoes] = await Promise.all([
      // Tenta JOIN com ESTAB para obter nome; fallback ao código
      (async () => {
        try {
          return await query(`
            SELECT DISTINCT E.COD_ESTAB AS id, E.NOM_ESTB AS label
            FROM ESTAB E
            INNER JOIN BI_ESTOQUE EST ON EST.EMPRESA = E.COD_ESTAB
            WHERE EST.${ACTIVE_SITUACAO}
            ORDER BY label
          `)
        } catch {
          return await query(`
            SELECT DISTINCT EMPRESA AS id, CAST(EMPRESA AS VARCHAR(20)) AS label
            FROM BI_ESTOQUE
            WHERE EMPRESA IS NOT NULL AND ${ACTIVE_SITUACAO}
            ORDER BY id
          `)
        }
      })(),
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
      empresas:    empresas.map(r => ({ id: n(r.ID || r.id), label: s(r.LABEL || r.label) })),
      materiais:   materiais.map(r => ({ id: n(r.ID || r.id), label: s(r.LABEL || r.label) })),
      blocos:      blocos.map(r => n(r.BLOCO || r.bloco)),
      espessuras:  espessuras.map(r => n(r.ESP || r.esp)).filter(e => e > 0),
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
    const nv   = v => Number(v ?? 0)

    res.json({
      custoTotal: nv(r.CUSTO_TOTAL ?? r.custo_total),
      totalM2:    nv(r.TOTAL_M2   ?? r.total_m2),
      qtdM2:      nv(r.QTD_M2    ?? r.qtd_m2),
      totalM3:    nv(r.TOTAL_M3   ?? r.total_m3),
      qtdM3:      nv(r.QTD_M3    ?? r.qtd_m3),
      cavaletes:  nv(r.CAVALETES  ?? r.cavaletes),
    })
  } catch (err) { next(err) }
})

// ─── Tabela Chapa / Recortado — com drill-down ────────────────
// Níveis: 0=Material 1=Bloco 2=Grupo 3=Espessura 4=Industrialização
//         5=Chapa    6=Lote  7=Unidade
router.get('/estoque/chapa', async (req, res, next) => {
  try {
    const nivel = Number(req.query.nivel || 0)
    const { where, params } = buildEstoqueFilters(req.query)

    // Filtros drill (pai → filho)
    const drill = []
    if (req.query.drill_cod_ma)  { drill.push('COD_MA = ?');               params.push(Number(req.query.drill_cod_ma)) }
    if (req.query.drill_bloco)   { drill.push('BLOCO = ?');                params.push(Number(req.query.drill_bloco)) }
    if (req.query.drill_grp)     { drill.push('COD_GRP = ?');              params.push(Number(req.query.drill_grp)) }
    if (req.query.drill_esp)     { drill.push('CAST(ESP_LQ AS INTEGER) = ?'); params.push(Number(req.query.drill_esp)) }
    if (req.query.drill_ind)     { drill.push('COMPOSICAO_MA = ?');        params.push(String(req.query.drill_ind)) }
    if (req.query.drill_chapa)   { drill.push('CHAPA = ?');                params.push(Number(req.query.drill_chapa)) }
    if (req.query.drill_lote)    { drill.push('LOTE = ?');                 params.push(String(req.query.drill_lote)) }

    const extra = [...(req.query.situacao ? [] : [STOCK_SITUACAO]), `UNIDADE = 'M2'`, ...drill]
    const w     = toWhere(where, extra)

    // SELECT e GROUP BY por nível
    let selectCols, groupBy, orderBy, labelKey, valueKey

    switch (nivel) {
      case 0:
        selectCols = `COD_MA, MATERIAL`
        groupBy    = `COD_MA, MATERIAL`
        labelKey   = 'MATERIAL'; valueKey = 'COD_MA'
        orderBy    = 'metragem DESC'
        break
      case 1:
        selectCols = `BLOCO`
        groupBy    = `BLOCO`
        labelKey   = 'BLOCO'; valueKey = 'BLOCO'
        orderBy    = 'BLOCO'
        break
      case 2:
        selectCols = `COD_GRP, GRUPO`
        groupBy    = `COD_GRP, GRUPO`
        labelKey   = 'GRUPO'; valueKey = 'COD_GRP'
        orderBy    = 'metragem DESC'
        break
      case 3:
        selectCols = `CAST(ESP_LQ AS INTEGER) AS esp_int`
        groupBy    = `CAST(ESP_LQ AS INTEGER)`
        labelKey   = 'ESP_INT'; valueKey = 'ESP_INT'
        orderBy    = 'esp_int'
        break
      case 4:
        selectCols = `COMPOSICAO_MA`
        groupBy    = `COMPOSICAO_MA`
        labelKey   = 'COMPOSICAO_MA'; valueKey = 'COMPOSICAO_MA'
        orderBy    = 'metragem DESC'
        break
      case 5:
        selectCols = `CHAPA`
        groupBy    = `CHAPA`
        labelKey   = 'CHAPA'; valueKey = 'CHAPA'
        orderBy    = 'CHAPA'
        break
      case 6:
        selectCols = `LOTE`
        groupBy    = `LOTE`
        labelKey   = 'LOTE'; valueKey = 'LOTE'
        orderBy    = 'metragem DESC'
        break
      case 7:
        selectCols = `UNIDADE`
        groupBy    = `UNIDADE`
        labelKey   = 'UNIDADE'; valueKey = 'UNIDADE'
        orderBy    = 'metragem DESC'
        break
      default:
        selectCols = `COD_MA, MATERIAL`
        groupBy    = `COD_MA, MATERIAL`
        labelKey   = 'MATERIAL'; valueKey = 'COD_MA'
        orderBy    = 'metragem DESC'
    }

    const sql = `
      SELECT
        ${selectCols},
        ROUND(SUM(QTDE), 2) AS metragem,
        SUM(QTDE_PC)        AS pc
      FROM BI_ESTOQUE ${w}
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
    `
    const rows = await query(sql, params)

    const total_met = rows.reduce((s, r) => s + Number(r.METRAGEM ?? r.metragem ?? 0), 0)
    const total_pc  = rows.reduce((s, r) => s + Number(r.PC       ?? r.pc       ?? 0), 0)

    const lk = labelKey.toLowerCase()
    const vk = valueKey.toLowerCase()

    res.json({
      nivel,
      maxNivel: 7,
      rows: rows.map(r => {
        const rawLabel = r[labelKey] ?? r[lk] ?? ''
        const rawValue = r[valueKey] ?? r[vk] ?? rawLabel
        return {
          label:    String(rawLabel).trim(),
          value:    rawValue,
          metragem: Number(r.METRAGEM ?? r.metragem ?? 0),
          pc:       Number(r.PC       ?? r.pc       ?? 0),
        }
      }),
      totais: {
        metragem: Number(total_met.toFixed(2)),
        pc:       Math.round(total_pc),
      },
    })
  } catch (err) { next(err) }
})

// ─── Tabela Bloco — com drill-down ───────────────────────────
// Níveis: 0=Material 1=Bloco 2=Unidade
router.get('/estoque/bloco', async (req, res, next) => {
  try {
    const nivel = Number(req.query.nivel || 0)
    const { where, params } = buildEstoqueFilters(req.query)

    const drill = []
    if (req.query.drill_cod_ma) { drill.push('COD_MA = ?'); params.push(Number(req.query.drill_cod_ma)) }
    if (req.query.drill_bloco)  { drill.push('BLOCO = ?');  params.push(Number(req.query.drill_bloco)) }

    const extra = [...(req.query.situacao ? [] : [STOCK_SITUACAO]), `UNIDADE = 'M3'`, ...drill]
    const w     = toWhere(where, extra)

    let selectCols, groupBy, orderBy, labelKey, valueKey

    switch (nivel) {
      case 0:
        selectCols = `COD_MA, MATERIAL`
        groupBy    = `COD_MA, MATERIAL`
        labelKey   = 'MATERIAL'; valueKey = 'COD_MA'
        orderBy    = 'metragem DESC'
        break
      case 1:
        selectCols = `BLOCO`
        groupBy    = `BLOCO`
        labelKey   = 'BLOCO'; valueKey = 'BLOCO'
        orderBy    = 'BLOCO'
        break
      case 2:
        selectCols = `UNIDADE`
        groupBy    = `UNIDADE`
        labelKey   = 'UNIDADE'; valueKey = 'UNIDADE'
        orderBy    = 'metragem DESC'
        break
      default:
        selectCols = `COD_MA, MATERIAL`
        groupBy    = `COD_MA, MATERIAL`
        labelKey   = 'MATERIAL'; valueKey = 'COD_MA'
        orderBy    = 'metragem DESC'
    }

    const sql = `
      SELECT
        ${selectCols},
        ROUND(SUM(QTDE), 2) AS metragem,
        SUM(QTDE_PC)        AS pc
      FROM BI_ESTOQUE ${w}
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
    `
    const rows = await query(sql, params)

    const total_met = rows.reduce((s, r) => s + Number(r.METRAGEM ?? r.metragem ?? 0), 0)
    const total_pc  = rows.reduce((s, r) => s + Number(r.PC       ?? r.pc       ?? 0), 0)

    const lk = labelKey.toLowerCase()
    const vk = valueKey.toLowerCase()

    res.json({
      nivel,
      maxNivel: 2,
      rows: rows.map(r => {
        const rawLabel = r[labelKey] ?? r[lk] ?? ''
        const rawValue = r[valueKey] ?? r[vk] ?? rawLabel
        return {
          label:    String(rawLabel).trim(),
          value:    rawValue,
          metragem: Number(r.METRAGEM ?? r.metragem ?? 0),
          pc:       Number(r.PC       ?? r.pc       ?? 0),
        }
      }),
      totais: {
        metragem: Number(total_met.toFixed(2)),
        pc:       Math.round(total_pc),
      },
    })
  } catch (err) { next(err) }
})

// ─── Matriz Estoque por Faturamento — usa BI_FATURAMENTO ─────
// Filtro período (DATA_EMISAO) APENAS aqui.
// Níveis: 0=Material  1=Unidade  2=Cliente  3=Pedido
router.get('/estoque/faturamento-matriz', async (req, res, next) => {
  try {
    const nivel = Number(req.query.nivel || 0)
    const { where, params } = buildFatFilters(req.query)

    const drill = []
    if (req.query.drill_cod_ma)     { drill.push('FAT.COD_MA = ?');       params.push(Number(req.query.drill_cod_ma)) }
    if (req.query.drill_unidade)    { drill.push('FAT.UNIDADE = ?');       params.push(String(req.query.drill_unidade)) }
    if (req.query.drill_cod_cliente){ drill.push('FAT.COD_CLIENTE = ?');   params.push(Number(req.query.drill_cod_cliente)) }

    // BI_FATURAMENTO usa alias FAT pois pode ter JOINs
    const fatWhere = [...where.map(c => c.replace(/^(COD_ESTAB|COD_MA|DATA_EMISAO)/, 'FAT.$1')), ...drill]
    const w = fatWhere.length ? `WHERE ${fatWhere.join(' AND ')}` : ''

    let selectCols, groupBy, labelKey, valueKey

    switch (nivel) {
      case 0:
        selectCols = `FAT.COD_MA, IIF(MA.MATERIAL IS NOT NULL, MA.MATERIAL, FAT.MATERIAL) AS dim_label`
        groupBy    = `FAT.COD_MA, IIF(MA.MATERIAL IS NOT NULL, MA.MATERIAL, FAT.MATERIAL)`
        labelKey   = 'DIM_LABEL'; valueKey = 'COD_MA'
        break
      case 1:
        selectCols = `FAT.UNIDADE AS dim_label`
        groupBy    = `FAT.UNIDADE`
        labelKey   = 'DIM_LABEL'; valueKey = 'DIM_LABEL'
        break
      case 2:
        selectCols = `FAT.COD_CLIENTE, TRIM(FAT.NOM_PESS) AS dim_label`
        groupBy    = `FAT.COD_CLIENTE, TRIM(FAT.NOM_PESS)`
        labelKey   = 'DIM_LABEL'; valueKey = 'COD_CLIENTE'
        break
      case 3:
        selectCols = `FAT.COD_DOC AS dim_label`
        groupBy    = `FAT.COD_DOC`
        labelKey   = 'DIM_LABEL'; valueKey = 'DIM_LABEL'
        break
      default:
        selectCols = `FAT.COD_MA, IIF(MA.MATERIAL IS NOT NULL, MA.MATERIAL, FAT.MATERIAL) AS dim_label`
        groupBy    = `FAT.COD_MA, IIF(MA.MATERIAL IS NOT NULL, MA.MATERIAL, FAT.MATERIAL)`
        labelKey   = 'DIM_LABEL'; valueKey = 'COD_MA'
    }

    const sql = `
      SELECT
        ${selectCols},
        EXTRACT(YEAR  FROM FAT.DATA_EMISAO) AS ano,
        EXTRACT(MONTH FROM FAT.DATA_EMISAO) AS mes,
        ROUND(SUM(FAT.QTDE), 2)             AS quantidade,
        ROUND(SUM(FAT.TOTAL_DOCIT), 2)      AS total
      FROM BI_FATURAMENTO FAT
      LEFT JOIN BI_MATERIAL MA ON MA.COD_MA = FAT.COD_MA
      ${w}
      GROUP BY ${groupBy},
               EXTRACT(YEAR  FROM FAT.DATA_EMISAO),
               EXTRACT(MONTH FROM FAT.DATA_EMISAO)
      ORDER BY dim_label, ano, mes
    `
    const rows = await query(sql, params)

    const lk = labelKey.toLowerCase()
    const vk = valueKey.toLowerCase()

    res.json({
      nivel,
      maxNivel: 3,
      rows: rows.map(r => ({
        label:      String(r[labelKey] ?? r[lk] ?? '').trim(),
        value:      r[valueKey]  ?? r[vk]  ?? '',
        ano:        Number(r.ANO        ?? r.ano        ?? 0),
        mes:        Number(r.MES        ?? r.mes        ?? 0),
        quantidade: Number(r.QUANTIDADE ?? r.quantidade ?? 0),
        total:      Number(r.TOTAL      ?? r.total      ?? 0),
      })),
    })
  } catch (err) { next(err) }
})

module.exports = router
