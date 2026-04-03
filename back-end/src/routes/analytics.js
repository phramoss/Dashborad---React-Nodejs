/**
 * analytics.js — VERSÃO CORRIGIDA
 *
 * Correções aplicadas:
 *
 * 1. KPI — ticket_medio
 *    ANTES: AVG(TOTAL_DOCIT) → média por linha de faturamento (errado)
 *    DEPOIS: SUM / COUNT(DISTINCT COD_CLIENTE) → ticket por cliente (correto)
 *
 * 2. KPI — total_m2
 *    ANTES: SUM(CASE WHEN UNIDADE='M2' THEN QTDE) → soma de área (número)
 *           sendo exibido como moeda no front (errado)
 *    DEPOIS: SUM(CASE WHEN UNIDADE='M2' THEN TOTAL_DOCIT) → receita em R$
 *
 * 3. top-materiais / por-grupo / mapa-faturamento
 *    ANTES: WHERE construído sem alias + regex replace frágil nas strings
 *    DEPOIS: usa buildFiltersForAlias('FAT') → alias correto desde o início
 *
 * 4. top-vendedores
 *    ANTES: VENDEDOR sem normalização
 *    DEPOIS: IIF para tratar '.' / ' ' / NULL → 'SEM VENDEDOR'
 *
 * 5. ultima-atualizacao
 *    ANTES: MAX(DATA_EMISAO) — campo DATE sem hora, sempre 00:00
 *    DEPOIS: MAX de DATA_EMISAO e DATA_SAIDA; retorna o mais recente
 */

const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const {
  addInFilter,
  addDateRange,
  addMonthFilter,
  buildFiltersForAlias,
} = require('../utils/sqlFilters')

// ─── Helper: filtros para queries SEM JOIN (tabela única BI_FATURAMENTO) ────
function buildDashFilters(qs) {
  const {
    cod_cliente, cod_vendedor, cod_ma, cod_grp,
    mercado, pais, uf, meses, data_ini, data_fim, data_tipo,
  } = qs

  const where  = []
  const params = []

  addInFilter(where, params, 'COD_CLIENTE',  cod_cliente,  Number)
  addInFilter(where, params, 'COD_VENDEDOR', cod_vendedor, Number)
  addInFilter(where, params, 'COD_MA',       cod_ma,       Number)
  addInFilter(where, params, 'COD_GRP',      cod_grp,      Number)
  addInFilter(where, params, 'MERCADO',      mercado,      String)
  addInFilter(where, params, 'PAIS',         pais,         String)
  addInFilter(where, params, 'UF',           uf,           String)

  const campoData =
    String(data_tipo || 'emissao').toLowerCase() === 'saida'
      ? 'DATA_SAIDA'
      : 'DATA_EMISAO'

  addDateRange(where, params, campoData, data_ini, data_fim)
  addMonthFilter(where, params, campoData, meses)

  return { where, params, campoData }
}

function toWhere(where) {
  return where.length ? `WHERE ${where.join(' AND ')}` : ''
}

// ─── KPI ─────────────────────────────────────────────────────────────────────
router.get('/analytics/kpi', async (req, res, next) => {
  try {
    const { where, params } = buildDashFilters(req.query)
    const w = toWhere(where)

    const sql = `
      SELECT
        SUM(TOTAL_DOCIT)                                                        AS faturamento,
        COUNT(DISTINCT COD_DOC)                                                 AS num_pedidos,
        COUNT(DISTINCT CASE WHEN MERCADO = 'EXTERNO' THEN COD_DOC END)          AS pedidos_exterior,
        COUNT(DISTINCT CASE WHEN MERCADO = 'INTERNO' THEN COD_DOC END)          AS pedidos_interno,

        /* FIX: totalM2 = RECEITA dos produtos M², não a área.
           Era SUM(QTDE) que dava um número sem sentido formatado como moeda. */
        SUM(CASE WHEN UNIDADE = 'M2' THEN TOTAL_DOCIT ELSE 0 END)               AS total_m2,
        SUM(CASE WHEN UNIDADE = 'M2' THEN QTDE_PC    ELSE 0 END)                AS qtd_m2,

        /* totalM3 = volume em M³ (exibido como número, não moeda) */
        SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE        ELSE 0 END)               AS total_m3,
        SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE_PC     ELSE 0 END)               AS qtd_m3,

        /* FIX: ticket_medio = receita total / nº de clientes distintos.
           Era AVG(TOTAL_DOCIT) que media por linha, não por cliente. */
        SUM(TOTAL_DOCIT) / NULLIF(COUNT(DISTINCT COD_CLIENTE), 0)               AS ticket_medio

      FROM BI_FATURAMENTO ${w}
    `

    const rows = await query(sql, params)
    const r    = rows[0] || {}

    res.json({
      faturamento:         Number(r.FATURAMENTO      || r.faturamento      || 0),
      numeroPedidos:       Number(r.NUM_PEDIDOS       || r.num_pedidos      || 0),
      pedidosExterior:     Number(r.PEDIDOS_EXTERIOR  || r.pedidos_exterior || 0),
      pedidosInterno:      Number(r.PEDIDOS_INTERNO   || r.pedidos_interno  || 0),
      totalM2:             Number(r.TOTAL_M2          || r.total_m2         || 0),
      qtdM2:               Number(r.QTD_M2            || r.qtd_m2           || 0),
      totalM3:             Number(r.TOTAL_M3          || r.total_m3         || 0),
      qtdM3:               Number(r.QTD_M3            || r.qtd_m3           || 0),
      ticketMedio:         Number(r.TICKET_MEDIO      || r.ticket_medio     || 0),
      variacaoFaturamento: 0,
      faturamentoAnterior: 0,
    })
  } catch (err) { next(err) }
})

// ─── Por Ano ─────────────────────────────────────────────────────────────────
router.get('/analytics/por-ano', async (req, res, next) => {
  try {
    const { where, params, campoData } = buildDashFilters(req.query)
    const w = toWhere(where)
    const sql = `
      SELECT EXTRACT(YEAR FROM ${campoData}) AS ano, ROUND(SUM(TOTAL_DOCIT), 2) AS total
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

// ─── Por Mês ─────────────────────────────────────────────────────────────────
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
      mesNumero:   Number(r.MES   || r.mes),
      faturamento: Number(r.TOTAL || r.total || 0),
    })))
  } catch (err) { next(err) }
})

// ─── Top Clientes ────────────────────────────────────────────────────────────
router.get('/analytics/top-clientes', async (req, res, next) => {
  try {
    const { limit } = req.query
    const lim = limit !== undefined ? Math.max(1, Number(limit)) : null
    const { where, params } = buildDashFilters(req.query)
    const w = toWhere(where)
    const rowsClause = lim !== null ? `ROWS 1 TO ${lim}` : ''
    const sql = `
      SELECT COD_CLIENTE AS cod_cliente, NOM_PESS AS cliente, SUM(TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO ${w}
      GROUP BY COD_CLIENTE, NOM_PESS
      ORDER BY total DESC
      ${rowsClause}
    `
    const rows = await query(sql, params)
    res.json(rows.map(r => ({
      clienteId:   Number(r.COD_CLIENTE || r.cod_cliente),
      clienteNome: String(r.CLIENTE     || r.cliente     || ''),
      faturamento: Number(r.TOTAL       || r.total       || 0),
    })))
  } catch (err) { next(err) }
})

// ─── Top Materiais ────────────────────────────────────────────────────────────
// FIX: usa buildFiltersForAlias('FAT') em vez de regex replace nos WHERE strings.
router.get('/analytics/top-materiais', async (req, res, next) => {
  try {
    const { limit } = req.query
    const lim = limit !== undefined ? Math.max(1, Number(limit)) : null
    const rowsClause = lim !== null ? `ROWS 1 TO ${lim}` : ''

    const { where, params, campoData } = buildFiltersForAlias(req.query, 'FAT')
    const w = toWhere(where)

    // Tenta com JOIN em BI_MATERIAL para pegar o nome correto
    const sqlJoin = `
      SELECT FAT.COD_MA, MA.MATERIAL AS nom_ma, ROUND(SUM(FAT.TOTAL_DOCIT), 2) AS total
      FROM BI_FATURAMENTO FAT
      LEFT JOIN BI_MATERIAL MA ON MA.COD_MA = FAT.COD_MA
      ${w}
      GROUP BY FAT.COD_MA, MA.MATERIAL
      ORDER BY total DESC
      ${rowsClause}
    `

    let rows
    try {
      rows = await query(sqlJoin, params)
    } catch {
      // Fallback sem JOIN (BI_MATERIAL pode não existir)
      const sqlFallback = `
        SELECT COD_MA, MATERIAL AS nom_ma, SUM(TOTAL_DOCIT) AS total
        FROM BI_FATURAMENTO ${w.replace(/\bFAT\./g, '')}
        GROUP BY COD_MA, MATERIAL
        ORDER BY total DESC
        ${rowsClause}
      `
      const { where: wFb, params: pFb } = buildDashFilters(req.query)
      rows = await query(sqlFallback, pFb)
    }

    res.json(rows.map(r => ({
      materialId:   Number(r.COD_MA   || r.cod_ma   || 0),
      materialNome: String(r.NOM_MA   || r.nom_ma   || r.MATERIAL || r.material || ''),
      faturamento:  Number(r.TOTAL    || r.total    || 0),
    })))
  } catch (err) { next(err) }
})

// ─── Top Vendedores ───────────────────────────────────────────────────────────
// FIX: normaliza vendedores com nome vazio / '.' / ' ' → 'SEM VENDEDOR'
router.get('/analytics/top-vendedores', async (req, res, next) => {
  try {
    const { limit = '20' } = req.query
    const lim = Math.min(100, Math.max(1, Number(limit)))
    const { where, params } = buildDashFilters(req.query)
    const w = toWhere(where)

    const sql = `
      SELECT
        COD_VENDEDOR AS cod_vendedor,
        IIF(
          VENDEDOR IS NULL OR TRIM(VENDEDOR) = '' OR TRIM(VENDEDOR) = '.',
          'SEM VENDEDOR',
          TRIM(VENDEDOR)
        ) AS vendedor,
        SUM(TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO ${w}
      GROUP BY
        COD_VENDEDOR,
        IIF(
          VENDEDOR IS NULL OR TRIM(VENDEDOR) = '' OR TRIM(VENDEDOR) = '.',
          'SEM VENDEDOR',
          TRIM(VENDEDOR)
        )
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

// ─── Por Grupo ────────────────────────────────────────────────────────────────
// FIX: usa buildFiltersForAlias('FAT')
router.get('/analytics/por-grupo', async (req, res, next) => {
  try {
    const { where, params } = buildFiltersForAlias(req.query, 'FAT')
    const w = toWhere(where)

    const sqlJoin = `
      SELECT FAT.COD_GRP AS cod_grp, GRP.NOM_GRP AS descricao, SUM(FAT.TOTAL_DOCIT) AS total
      FROM BI_FATURAMENTO FAT
      LEFT JOIN BI_GRUPO GRP ON GRP.COD_GRP = FAT.COD_GRP
      ${w}
      GROUP BY FAT.COD_GRP, GRP.NOM_GRP
      ORDER BY total DESC
    `

    let rows
    try {
      rows = await query(sqlJoin, params)
    } catch {
      const { where: wFb, params: pFb } = buildDashFilters(req.query)
      const sqlFallback = `
        SELECT COD_GRP AS cod_grp, COD_GRP AS descricao, SUM(TOTAL_DOCIT) AS total
        FROM BI_FATURAMENTO ${toWhere(wFb)}
        GROUP BY COD_GRP
        ORDER BY total DESC
      `
      rows = await query(sqlFallback, pFb)
    }

    res.json(rows.map(r => ({
      grupoId:     Number(r.COD_GRP   || r.cod_grp   || 0),
      grupoNome:   String(r.DESCRICAO || r.descricao || `Grupo ${r.COD_GRP || r.cod_grp}`),
      faturamento: Number(r.TOTAL     || r.total      || 0),
    })))
  } catch (err) { next(err) }
})

// ─── Série mensal (expand all) ────────────────────────────────────────────────
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

// ─── Rosca por mercado ────────────────────────────────────────────────────────
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

// ─── Mapa de Faturamento por Município ───────────────────────────────────────
// FIX: usa buildFiltersForAlias('FAT') — sem regex replace
router.get('/analytics/mapa-faturamento', async (req, res, next) => {
  try {
    const baseWhere = [`UF_PESS <> 'EX'`, `FAT.TOTAL_DOCIT > 0`]
    const { where, params } = buildFiltersForAlias(req.query, 'FAT')
    const w = toWhere([...baseWhere, ...where])

    const sql = `
      SELECT
        MUN_PESS MUNICIPIO,
        UF_PESS UF,
        LATITUDE,
        LONGITUDE,
        ROUND(SUM(FAT.TOTAL_DOCIT), 2) AS total,
        COUNT(DISTINCT BI_CLIENTE.COD_CLIENTE) AS num_clientes
      FROM BI_CLIENTE
      JOIN BI_FATURAMENTO FAT ON BI_CLIENTE.COD_CLIENTE = FAT.COD_CLIENTE
      ${w}
      GROUP BY MUN_PESS, UF_PESS, LATITUDE, LONGITUDE
      ORDER BY total DESC
      ROWS 1 TO 150
    `
    const rows = await query(sql, params)
    res.json(rows.map(r => ({
      municipio:   String(r.MUNICIPIO    || r.municipio    || ''),
      uf:          String(r.UF           || r.uf           || ''),
      lat:         Number(r.LATITUDE     || r.latitude     || 0),
      lng:         Number(r.LONGITUDE    || r.longitude    || 0),
      faturamento: Number(r.TOTAL        || r.total        || 0),
      numClientes: Number(r.NUM_CLIENTES || r.num_clientes || 0),
    })))
  } catch (err) { next(err) }
})

// ─── Última atualização ───────────────────────────────────────────────────────
// FIX: inclui DATA_SAIDA no MAX para capturar o registro mais recente real.
// DATA_EMISAO é campo DATE (sem hora) → retornava sempre 00:00.
// DATA_SAIDA pode ser TIMESTAMP → tem hora precisa.
router.get('/analytics/ultima-atualizacao', async (req, res, next) => {
  try {
    // Tenta pegar o MAX de DATA_SAIDA (timestamp) e DATA_EMISAO (date)
    // e retorna o mais recente entre os dois.
    const sql = `
      SELECT
        MAX(DATA_SAIDA)  AS ultima_saida,
        MAX(DATA_EMISAO) AS ultima_emissao
      FROM BI_FATURAMENTO
      WHERE DATA_SAIDA IS NOT NULL OR DATA_EMISAO IS NOT NULL
    `
    const rows = await query(sql)
    const r    = rows[0] || {}

    const saida   = r.ULTIMA_SAIDA   || r.ultima_saida   || null
    const emissao = r.ULTIMA_EMISSAO || r.ultima_emissao || null

    // Pega o mais recente entre os dois campos
    let ultimaData = null
    if (saida && emissao) {
      ultimaData = new Date(saida) >= new Date(emissao) ? saida : emissao
    } else {
      ultimaData = saida || emissao
    }

    res.json({
      ultimaAtualizacao: ultimaData ? new Date(ultimaData).toISOString() : null,
    })
  } catch (err) { next(err) }
})


// ─── Diagnóstico do mapa (remover após confirmar os dados) ────────────────────
router.get('/analytics/mapa-debug', async (req, res, next) => {
  try {
    const safe = async (sql) => {
      try { return await query(sql) } catch { return [{ total: 'ERRO' }] }
    }
    const [r1] = await safe(`SELECT COUNT(*) AS total FROM LATLONG`)
    const [r2] = await safe(`SELECT COUNT(*) AS total FROM BI_CLIENTE WHERE IBGE_MUN IS NOT NULL`)
    const [r3] = await safe(`
      SELECT COUNT(*) AS total FROM BI_CLIENTE CLI
      INNER JOIN LATLONG LL ON LL.GEOCODIGO_MUNICIPIO = CLI.IBGE_MUN
    `)
    const [r4] = await safe(`
      SELECT COUNT(*) AS total FROM BI_FATURAMENTO FAT
      INNER JOIN BI_CLIENTE CLI ON CLI.COD_CLIENTE = FAT.COD_CLIENTE
      INNER JOIN LATLONG LL ON LL.GEOCODIGO_MUNICIPIO = CLI.IBGE_MUN
    `)
    const n = x => Number(x?.TOTAL ?? x?.total ?? 0)
    const ll = n(r1), ibge = n(r2), match = n(r3), fat = n(r4)
    res.json({
      latlong_registros: ll,
      clientes_com_ibge_mun: ibge,
      clientes_com_match_latlong: match,
      faturamento_com_geo: fat,
      diagnostico:
        fat > 0 ? '✅ Dados OK — mapa deve aparecer' :
        ll === 0 ? '❌ Tabela LATLONG está vazia' :
        ibge === 0 ? '❌ BI_CLIENTE.IBGE_MUN não está preenchido' :
        match === 0 ? '❌ GEOCODIGO_MUNICIPIO x IBGE_MUN sem correspondência (verificar formato/tipo)' :
        '❌ JOIN faturamento sem resultado — verificar COD_CLIENTE',
    })
  } catch (err) { next(err) }
})

module.exports = router
