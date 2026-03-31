const express = require('express')
const router = express.Router()
const { query } = require('../db')
const { addInFilter, addDateRange, addMonthFilter } = require('../utils/sqlFilters')

// ✅ Agora lê `meses` do req.query e aplica em todas as rotas
function buildDashFilters(qs) {
  const {
    cod_cliente,
    cod_vendedor,
    cod_ma,
    cod_grp,
    mercado,
    pais,
    uf,
    meses,
    data_ini,
    data_fim,
    data_tipo,
  } = qs

  const where = []
  const params = []

  addInFilter(where, params, 'COD_CLIENTE',  cod_cliente,  Number)
  addInFilter(where, params, 'COD_VENDEDOR', cod_vendedor, Number)
  addInFilter(where, params, 'COD_MA',       cod_ma,       Number)
  addInFilter(where, params, 'COD_GRP',      cod_grp,      Number)
  addInFilter(where, params, 'MERCADO', mercado, String)
  addInFilter(where, params, 'PAIS',    pais,    String)
  addInFilter(where, params, 'UF',      uf,      String)

  const campoData =
    String(data_tipo || 'emissao').toLowerCase() === 'saida'
      ? 'DATA_SAIDA'
      : 'DATA_EMISAO'

  addDateRange(where, params, campoData, data_ini, data_fim)

  // ✅ Filtro de meses: EXTRACT(MONTH FROM DATA_EMISAO) IN (?, ...)
  addMonthFilter(where, params, campoData, meses)

  return { where, params, campoData }
}

function toWhere(where) {
  return where.length ? `WHERE ${where.join(' AND ')}` : ''
}

router.get('/analytics/kpi', async (req, res, next) => {
  try {
    const { where, params } = buildDashFilters(req.query)
    const w = toWhere(where)
    const sql = `
      SELECT
        SUM(TOTAL_DOCIT)                                    AS faturamento,
        COUNT(DISTINCT COD_DOC)                             AS num_pedidos,
        COUNT(DISTINCT CASE WHEN MERCADO = 'EXTERNO' THEN COD_DOC END) AS pedidos_exterior,
        COUNT(DISTINCT CASE WHEN MERCADO = 'INTERNO' THEN COD_DOC END) AS pedidos_interno,
        SUM(CASE WHEN UNIDADE = 'M2' THEN QTDE END) AS total_m2,
        SUM(CASE WHEN UNIDADE = 'M2' THEN QTDE_PC END)        AS qtd_m2,
        SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE END) AS total_m3,
        SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE_PC END)        AS qtd_m3,
        AVG(TOTAL_DOCIT)                                    AS ticket_medio
        
      FROM BI_FATURAMENTO ${w}
    `
    const rows = await query(sql, params)
    const r = rows[0] || {}
    res.json({
      faturamento:         Number(r.FATURAMENTO          || r.faturamento        || 0),
      numeroPedidos:       Number(r.NUM_PEDIDOS          || r.num_pedidos        || 0),
      pedidosExterior:     Number(r.PEDIDOS_EXTERIOR     || r.pedidos_exterior   || 0),
      pedidosInterno:      Number(r.PEDIDOS_INTERNO      || r.pedidos_interno    || 0),
      totalM2:             Number(r.TOTAL_M2             || r.total_m2           || 0),
      qtdM2:               Number(r.QTD_M2               || r.qtd_m2             || 0),
      totalM3:             Number(r.TOTAL_M3             || r.total_m3           || 0),
      qtdM3:               Number(r.QTD_M3               || r.qtd_m3             || 0),
      ticketMedio:         Number(r.TICKET_MEDIO         || r.ticket_medio       || 0),
      variacaoFaturamento: 0,
      faturamentoAnterior: 0,
    })
  } catch (err) { next(err) }
})

router.get('/analytics/por-ano', async (req, res, next) => {
  try {
    const { where, params, campoData } = buildDashFilters(req.query)
    const w = toWhere(where)
    const sql = `
      SELECT EXTRACT(YEAR FROM ${campoData}) AS ano, SUM(TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO ${w}
      GROUP BY EXTRACT(YEAR FROM ${campoData})
      ORDER BY ano
    `
    const rows = await query(sql, params)
    res.json(rows.map(r => ({
      periodo:     String(Number(r.ANO   || r.ano)),
      faturamento: Number(r.TOTAL || r.total || 0),
    })))
  } catch (err) { next(err) }
})

router.get('/analytics/por-mes', async (req, res, next) => {
  try {
    const { where, params, campoData } = buildDashFilters(req.query)
    const w = toWhere(where)
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const sql = `
      SELECT EXTRACT(MONTH FROM ${campoData}) AS mes, SUM(TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO ${w}
      GROUP BY EXTRACT(MONTH FROM ${campoData})
      ORDER BY mes
    `
    const rows = await query(sql, params)
    res.json(rows.map(r => ({
      periodo:     MESES[(Number(r.MES || r.mes) - 1)] ?? String(r.MES || r.mes),
      mesNumero:   Number(r.MES || r.mes),
      faturamento: Number(r.TOTAL || r.total || 0),
    })))
  } catch (err) { next(err) }
})

router.get('/analytics/top-clientes', async (req, res, next) => {
  try {
    const { limit = '10' } = req.query
    const lim = Math.min(100, Math.max(1, Number(limit)))
    const { where, params } = buildDashFilters(req.query)
    const w = toWhere(where)
    const sql = `
      SELECT COD_CLIENTE AS cod_cliente, NOM_PESS AS cliente, SUM(TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO ${w}
      GROUP BY COD_CLIENTE, NOM_PESS
      ORDER BY total DESC
      ROWS 1 TO ${lim}
    `
    const rows = await query(sql, params)
    res.json(rows.map(r => ({
      clienteId:   Number(r.COD_CLIENTE || r.cod_cliente),
      clienteNome: String(r.CLIENTE     || r.cliente    || ''),
      faturamento: Number(r.TOTAL       || r.total      || 0),
    })))
  } catch (err) { next(err) }
})

router.get('/analytics/top-materiais', async (req, res, next) => {
  try {
    const { limit = '10' } = req.query
    const lim = Math.min(100, Math.max(1, Number(limit)))
    const { where, params } = buildDashFilters(req.query)
    const w = toWhere(where)
    const wMat = w
      .replace(/\bDATA_EMISAO\b/g, 'FAT.DATA_EMISAO')
      .replace(/\bDATA_SAIDA\b/g, 'FAT.DATA_SAIDA')
      .replace(/EXTRACT\(MONTH FROM DATA_EMISAO\)/g, 'EXTRACT(MONTH FROM FAT.DATA_EMISAO)')
      .replace(/EXTRACT\(MONTH FROM DATA_SAIDA\)/g, 'EXTRACT(MONTH FROM FAT.DATA_SAIDA)')
      .replace(/\bCOD_CLIENTE\b/g, 'FAT.COD_CLIENTE')
      .replace(/\bCOD_VENDEDOR\b/g, 'FAT.COD_VENDEDOR')
      .replace(/\bCOD_MA\b/g, 'FAT.COD_MA')
      .replace(/\bCOD_GRP\b/g, 'FAT.COD_GRP')
      .replace(/\bMERCADO\b/g, 'FAT.MERCADO')
      .replace(/\bPAIS\b/g, 'FAT.PAIS')
      .replace(/\bUF\b/g, 'FAT.UF')
    const sql = `
      SELECT FAT.COD_MA, MA.MATERIAL AS nom_ma, SUM(FAT.TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO FAT
      LEFT JOIN BI_MATERIAL MA ON MA.COD_MA = FAT.COD_MA
      ${wMat}
      GROUP BY FAT.COD_MA, MA.MATERIAL
      ORDER BY total DESC
      ROWS 1 TO ${lim}
    `
    let rows
    try {
      rows = await query(sql, params)
    } catch {
      const sqlFallback = `
        SELECT COD_MA, MATERIAL, SUM(TOTAL_DOCIT) AS total
        FROM BI_FATURAMENTO ${w}
        GROUP BY COD_MA, MATERIAL
        ORDER BY total DESC ROWS 1 TO ${lim}
      `
      rows = await query(sqlFallback, params)
    }
    res.json(rows.map(r => ({
      materialId:   Number(r.COD_MA   || r.cod_ma   || 0),
      materialNome: String(r.NOM_MA   || r.nom_ma   || r.MATERIAL || r.material || ''),
      faturamento:  Number(r.TOTAL    || r.total    || 0),
    })))
  } catch (err) { next(err) }
})

router.get('/analytics/top-vendedores', async (req, res, next) => {
  try {
    const { limit = '20' } = req.query
    const lim = Math.min(100, Math.max(1, Number(limit)))
    const { where, params } = buildDashFilters(req.query)
    const w = toWhere(where)
    const sql = `
      SELECT COD_VENDEDOR AS cod_vendedor, VENDEDOR AS vendedor, SUM(TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO ${w}
      GROUP BY COD_VENDEDOR, VENDEDOR
      ORDER BY total DESC
      ROWS 1 TO ${lim}
    `
    const rows = await query(sql, params)
    res.json(rows.map(r => ({
      vendedorId:   Number(r.COD_VENDEDOR || r.cod_vendedor || 0),
      vendedorNome: String(r.VENDEDOR     || r.vendedor     || ''),
      faturamento:  Number(r.TOTAL        || r.total        || 0),
    })))
  } catch (err) { next(err) }
})

router.get('/analytics/por-grupo', async (req, res, next) => {
  try {
    const { where, params } = buildDashFilters(req.query)
    const w = toWhere(where)
    const wFat = w
      .replace(/\bDATA_EMISAO\b/g, 'FAT.DATA_EMISAO')
      .replace(/\bDATA_SAIDA\b/g, 'FAT.DATA_SAIDA')
      .replace(/EXTRACT\(MONTH FROM DATA_EMISAO\)/g, 'EXTRACT(MONTH FROM FAT.DATA_EMISAO)')
      .replace(/EXTRACT\(MONTH FROM DATA_SAIDA\)/g, 'EXTRACT(MONTH FROM FAT.DATA_SAIDA)')
      .replace(/\bCOD_CLIENTE\b/g, 'FAT.COD_CLIENTE')
      .replace(/\bCOD_VENDEDOR\b/g, 'FAT.COD_VENDEDOR')
      .replace(/\bCOD_MA\b/g, 'FAT.COD_MA')
      .replace(/\bCOD_GRP\b/g, 'FAT.COD_GRP')
      .replace(/\bMERCADO\b/g, 'FAT.MERCADO')
      .replace(/\bPAIS\b/g, 'FAT.PAIS')
      .replace(/\bUF\b/g, 'FAT.UF')
    const sql = `
      SELECT FAT.COD_GRP AS cod_grp, GRP.NOM_GRP AS descricao, SUM(FAT.TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO FAT
      LEFT JOIN BI_GRUPO GRP ON GRP.COD_GRP = FAT.COD_GRP
      ${wFat}
      GROUP BY FAT.COD_GRP, GRP.NOM_GRP
      ORDER BY total DESC
    `
    let rows
    try {
      rows = await query(sql, params)
    } catch {
      const sqlFallback = `
        SELECT COD_GRP AS cod_grp, COD_GRP AS descricao, SUM(TOTAL_DOCIT) AS total
        FROM BI_FATURAMENTO ${w}
        GROUP BY COD_GRP
        ORDER BY total DESC
      `
      rows = await query(sqlFallback, params)
    }
    res.json(rows.map(r => ({
      grupoId:     Number(r.COD_GRP   || r.cod_grp   || 0),
      grupoNome:   String(r.DESCRICAO || r.descricao || `Grupo ${r.COD_GRP || r.cod_grp}`),
      faturamento: Number(r.TOTAL     || r.total      || 0),
    })))
  } catch (err) { next(err) }
})

router.get('/analytics/rosca/mercado', async (req, res, next) => {
  try {
    const { where, params } = buildDashFilters(req.query)
    const w = toWhere(where)
    const sql = `
      SELECT COALESCE(MERCADO, 'N/I') AS categoria, SUM(TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO ${w}
      GROUP BY COALESCE(MERCADO, 'N/I')
      ORDER BY total DESC
    `
    const rows = await query(sql, params)
    res.json(rows.map(r => ({
      grupoId:     String(r.CATEGORIA  || r.categoria),
      grupoNome:   String(r.CATEGORIA  || r.categoria),
      faturamento: Number(r.TOTAL      || r.total || 0),
    })))
  } catch (err) { next(err) }
})

router.get('/analytics/serie/mensal', async (req, res, next) => {
  try {
    const { where, params, campoData } = buildDashFilters(req.query)
    const w = toWhere(where)
    const sql = `
      SELECT
        EXTRACT(YEAR  FROM ${campoData}) AS ano,
        EXTRACT(MONTH FROM ${campoData}) AS mes,
        SUM(TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO ${w}
      GROUP BY EXTRACT(YEAR FROM ${campoData}), EXTRACT(MONTH FROM ${campoData})
      ORDER BY ano, mes
    `
    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) { next(err) }
})

module.exports = router