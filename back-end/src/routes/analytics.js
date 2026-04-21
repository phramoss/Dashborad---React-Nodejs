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
        SUM(CASE WHEN UNIDADE = 'M2' THEN QTDE ELSE 0 END)                      AS total_m2,
        SUM(CASE WHEN UNIDADE = 'M2' THEN QTDE_PC    ELSE 0 END)                AS qtd_m2,
        SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE        ELSE 0 END)               AS total_m3,
        SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE_PC     ELSE 0 END)               AS qtd_m3,
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
    const { limit = '20' } = req.query
    const lim = Math.min(200, Math.max(1, Number(limit)))
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
      clienteNome: String(r.CLIENTE     || r.cliente     || ''),
      faturamento: Number(r.TOTAL       || r.total       || 0),
    })))
  } catch (err) { next(err) }
})

// ─── Top Materiais ────────────────────────────────────────────────────────────
// FIX: usa buildFiltersForAlias('FAT') em vez de regex replace nos WHERE strings.
router.get('/analytics/top-materiais', async (req, res, next) => {
  try {
    const { limit = '20' } = req.query
    const lim = Math.min(200, Math.max(1, Number(limit)))
    const rowsClause = `ROWS 1 TO ${lim}`

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
router.get('/analytics/mapa-faturamento', async (req, res, next) => {
  function parseCoord(val) {
    if (val == null) return 0
    if (typeof val === 'number') return isNaN(val) ? 0 : val
    const cleaned = String(val).replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  try {
    const baseWhere = [`CLI.UF_PESS <> 'EX'`, `FAT.TOTAL_DOCIT > 0`]
    const { where, params } = buildFiltersForAlias(req.query, 'FAT')
    const w = toWhere([...baseWhere, ...where])

    // Tenta primeiro com LATITUDE/LONGITUDE direto em BI_CLIENTE
    const sqlDirect = `
      SELECT
        CLI.MUN_PESS AS MUNICIPIO,
        CLI.UF_PESS  AS UF,
        CLI.LATITUDE,
        CLI.LONGITUDE,
        ROUND(SUM(FAT.TOTAL_DOCIT), 2) AS total,
        COUNT(DISTINCT CLI.COD_CLIENTE) AS num_clientes
      FROM BI_CLIENTE CLI
      JOIN BI_FATURAMENTO FAT ON CLI.COD_CLIENTE = FAT.COD_CLIENTE
      ${w}
      GROUP BY CLI.MUN_PESS, CLI.UF_PESS, CLI.LATITUDE, CLI.LONGITUDE
      ORDER BY total DESC
      ROWS 1 TO 150
    `

    // Fallback: JOIN com tabela LATLONG pelo campo IBGE_MUN
    const sqlLatlong = `
      SELECT
        CLI.MUN_PESS AS MUNICIPIO,
        CLI.UF_PESS  AS UF,
        LL.LATITUDE,
        LL.LONGITUDE,
        ROUND(SUM(FAT.TOTAL_DOCIT), 2) AS total,
        COUNT(DISTINCT CLI.COD_CLIENTE) AS num_clientes
      FROM BI_CLIENTE CLI
      JOIN BI_FATURAMENTO FAT ON CLI.COD_CLIENTE = FAT.COD_CLIENTE
      JOIN LATLONG LL ON LL.GEOCODIGO_MUNICIPIO = CLI.IBGE_MUN
      ${w}
      GROUP BY CLI.MUN_PESS, CLI.UF_PESS, LL.LATITUDE, LL.LONGITUDE
      ORDER BY total DESC
      ROWS 1 TO 150
    `

    let rows
    try {
      rows = await query(sqlDirect, params)
      // Se nenhuma linha tem coordenada válida, tenta o fallback com LATLONG
      const hasCoords = rows.some(r => parseCoord(r.LATITUDE ?? r.latitude) !== 0)
      if (!hasCoords && rows.length > 0) {
        rows = await query(sqlLatlong, params)
      }
    } catch {
      rows = await query(sqlLatlong, params)
    }

    console.log('[mapa-faturamento] rows retornados:', rows.length)
    if (rows.length > 0) console.log('[mapa-faturamento] amostra:', rows[0])

    res.json(rows.map(r => ({
      municipio:   String(r.MUNICIPIO    || r.municipio    || ''),
      uf:          String(r.UF           || r.uf           || ''),
      lat:         parseCoord(r.LATITUDE  ?? r.latitude),
      lng:         parseCoord(r.LONGITUDE ?? r.longitude),
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

// ─── Dashboard Combinado ──────────────────────────────────────────────────────
// PERFORMANCE: 1 request HTTP = KPI + porAno + topClientes + topMateriais +
// topVendedores + porGrupo, rodando em paralelo dentro do mesmo roundtrip.
// Reduz latência de ~10 requests sequenciais para 1 request com Promise.all.
router.get('/analytics/dashboard', async (req, res, next) => {
  try {
    const { where, params, campoData } = buildDashFilters(req.query)
    const w = toWhere(where)

    // Filtros com alias para queries com JOIN
    const { where: wFat, params: pFat } = buildFiltersForAlias(req.query, 'FAT')
    const wJoin = toWhere(wFat)

    const [kpiRows, anoRows, clienteRows, vendedorRows, grupoRows, materialRows] = await Promise.all([
      // KPI
      query(`
        SELECT
          SUM(TOTAL_DOCIT) AS faturamento,
          COUNT(DISTINCT COD_DOC) AS num_pedidos,
          COUNT(DISTINCT CASE WHEN MERCADO = 'EXTERNO' THEN COD_DOC END) AS pedidos_exterior,
          COUNT(DISTINCT CASE WHEN MERCADO = 'INTERNO' THEN COD_DOC END) AS pedidos_interno,
          SUM(CASE WHEN UNIDADE = 'M2' THEN QTDE ELSE 0 END) AS total_m2,
          SUM(CASE WHEN UNIDADE = 'M2' THEN QTDE_PC ELSE 0 END) AS qtd_m2,
          SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE ELSE 0 END) AS total_m3,
          SUM(CASE WHEN UNIDADE = 'M3' THEN QTDE_PC ELSE 0 END) AS qtd_m3,
          SUM(TOTAL_DOCIT) / NULLIF(COUNT(DISTINCT COD_CLIENTE), 0) AS ticket_medio
        FROM BI_FATURAMENTO ${w}
      `, params),

      // Por Ano
      query(`
        SELECT EXTRACT(YEAR FROM ${campoData}) AS ano, ROUND(SUM(TOTAL_DOCIT), 2) AS total
        FROM BI_FATURAMENTO ${w}
        GROUP BY EXTRACT(YEAR FROM ${campoData})
        ORDER BY ano
      `, params),

      // Top Clientes (limit 20)
      query(`
        SELECT COD_CLIENTE AS cod_cliente, NOM_PESS AS cliente, SUM(TOTAL_DOCIT) AS total
        FROM BI_FATURAMENTO ${w}
        GROUP BY COD_CLIENTE, NOM_PESS
        ORDER BY total DESC ROWS 1 TO 20
      `, params),

      // Top Vendedores (limit 20)
      query(`
        SELECT COD_VENDEDOR AS cod_vendedor,
          IIF(VENDEDOR IS NULL OR TRIM(VENDEDOR)='' OR TRIM(VENDEDOR)='.','SEM VENDEDOR',TRIM(VENDEDOR)) AS vendedor,
          SUM(TOTAL_DOCIT) AS total
        FROM BI_FATURAMENTO ${w}
        GROUP BY COD_VENDEDOR,
          IIF(VENDEDOR IS NULL OR TRIM(VENDEDOR)='' OR TRIM(VENDEDOR)='.','SEM VENDEDOR',TRIM(VENDEDOR))
        ORDER BY total DESC ROWS 1 TO 20
      `, params),

      // Por Grupo (com JOIN)
      (async () => {
        try {
          return await query(`
            SELECT FAT.COD_GRP AS cod_grp, GRP.NOM_GRP AS descricao, SUM(FAT.TOTAL_DOCIT) AS total
            FROM BI_FATURAMENTO FAT
            LEFT JOIN BI_GRUPO GRP ON GRP.COD_GRP = FAT.COD_GRP
            ${wJoin}
            GROUP BY FAT.COD_GRP, GRP.NOM_GRP
            ORDER BY total DESC
          `, pFat)
        } catch {
          return await query(`
            SELECT COD_GRP AS cod_grp, COD_GRP AS descricao, SUM(TOTAL_DOCIT) AS total
            FROM BI_FATURAMENTO ${w}
            GROUP BY COD_GRP ORDER BY total DESC
          `, params)
        }
      })(),

      // Top Materiais (com JOIN, limit 20)
      (async () => {
        try {
          return await query(`
            SELECT FAT.COD_MA, MA.MATERIAL AS nom_ma, ROUND(SUM(FAT.TOTAL_DOCIT), 2) AS total
            FROM BI_FATURAMENTO FAT
            LEFT JOIN BI_MATERIAL MA ON MA.COD_MA = FAT.COD_MA
            ${wJoin}
            GROUP BY FAT.COD_MA, MA.MATERIAL
            ORDER BY total DESC ROWS 1 TO 20
          `, pFat)
        } catch {
          return await query(`
            SELECT COD_MA, MATERIAL AS nom_ma, SUM(TOTAL_DOCIT) AS total
            FROM BI_FATURAMENTO ${w}
            GROUP BY COD_MA, MATERIAL
            ORDER BY total DESC ROWS 1 TO 20
          `, params)
        }
      })(),
    ])

    const r = kpiRows[0] || {}
    const n = (v) => Number(v || 0)

    res.json({
      kpi: {
        faturamento:         n(r.FATURAMENTO       ?? r.faturamento),
        numeroPedidos:       n(r.NUM_PEDIDOS       ?? r.num_pedidos),
        pedidosExterior:     n(r.PEDIDOS_EXTERIOR  ?? r.pedidos_exterior),
        pedidosInterno:      n(r.PEDIDOS_INTERNO   ?? r.pedidos_interno),
        totalM2:             n(r.TOTAL_M2          ?? r.total_m2),
        qtdM2:               n(r.QTD_M2            ?? r.qtd_m2),
        totalM3:             n(r.TOTAL_M3          ?? r.total_m3),
        qtdM3:               n(r.QTD_M3            ?? r.qtd_m3),
        ticketMedio:         n(r.TICKET_MEDIO      ?? r.ticket_medio),
        variacaoFaturamento: 0,
        faturamentoAnterior: 0,
      },
      porAno: anoRows.map(r => ({
        periodo:     String(Number(r.ANO   ?? r.ano)),
        faturamento: n(r.TOTAL ?? r.total),
      })),
      topClientes: clienteRows.map(r => ({
        clienteId:   Number(r.COD_CLIENTE ?? r.cod_cliente),
        clienteNome: String(r.CLIENTE     ?? r.cliente     ?? ''),
        faturamento: n(r.TOTAL ?? r.total),
      })),
      topVendedores: vendedorRows.map(r => ({
        vendedorId:   Number(r.COD_VENDEDOR ?? r.cod_vendedor ?? 0),
        vendedorNome: String(r.VENDEDOR     ?? r.vendedor     ?? ''),
        faturamento:  n(r.TOTAL ?? r.total),
      })),
      porGrupo: grupoRows.map(r => ({
        grupoId:     Number(r.COD_GRP   ?? r.cod_grp   ?? 0),
        grupoNome:   String(r.DESCRICAO ?? r.descricao ?? `Grupo ${r.COD_GRP ?? r.cod_grp}`),
        faturamento: n(r.TOTAL ?? r.total),
      })),
      topMateriais: materialRows.map(r => ({
        materialId:   Number(r.COD_MA   ?? r.cod_ma   ?? 0),
        materialNome: String(r.NOM_MA   ?? r.nom_ma   ?? r.MATERIAL ?? r.material ?? ''),
        faturamento:  n(r.TOTAL ?? r.total),
      })),
    })
  } catch (err) { next(err) }
})

module.exports = router