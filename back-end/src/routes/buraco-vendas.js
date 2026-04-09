/**
 * routes/buraco-vendas.js
 *
 * Endpoints da tela "Buraco de Vendas":
 *   GET /buraco-vendas/sequencia          — Bloco 1: pivot Cliente × Mês
 *   GET /buraco-vendas/estoque-faturamento — Bloco 2: pivot Material × Mês (Qtde + Total)
 *   GET /buraco-vendas/materiais-comprados — Bloco 3: tabela flat de materiais
 *
 * Blocos 4 e 5 (Chapa / Bloco) reusam os endpoints já existentes
 * em /estoque/chapa e /estoque/bloco.
 *
 * Filtros disponíveis: reusam /filtros/* já existentes.
 */

const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { buildFiltersForAlias } = require('../utils/sqlFilters')

// ─── Helpers ─────────────────────────────────────────────────
function toWhere(where) {
  return where.length ? `WHERE ${where.join(' AND ')}` : ''
}

/**
 * Reordena rows planas (client×período) após a query SQL.
 * dimKey  = campo que identifica a dimensão (ex: 'DIM_VALUE' ou 'DIM_LABEL')
 * sortCol = 'nome' | 'total' | 'YYYY-MM'
 * sortDir = 'asc' | 'desc'
 */
function sortRowsByCol(rows, dimKey, sortCol, sortDir) {
  if (!sortCol || sortCol === 'nome') return rows  // ORDER BY SQL já resolve

  const dk = dimKey.toLowerCase()
  const dir = sortDir === 'desc' ? -1 : 1

  // Mapa dim → valor de sort
  const valueMap = new Map()

  if (sortCol === 'total') {
    // Soma de TOTAL em todos os períodos para cada dim
    rows.forEach(r => {
      const k = String(r[dimKey] ?? r[dk] ?? '')
      valueMap.set(k, (valueMap.get(k) ?? 0) + Number(r.TOTAL ?? r.total ?? 0))
    })
  } else {
    // Período específico (YYYY-MM)
    const [anoStr, mesStr] = sortCol.split('-')
    const anoSort = Number(anoStr)
    const mesSort = Number(mesStr)
    if (!anoSort || !mesSort) return rows
    rows.forEach(r => {
      const ano = Number(r.ANO ?? r.ano ?? 0)
      const mes = Number(r.MES ?? r.mes ?? 0)
      if (ano === anoSort && mes === mesSort) {
        const k = String(r[dimKey] ?? r[dk] ?? '')
        valueMap.set(k, (valueMap.get(k) ?? 0) + Number(r.TOTAL ?? r.total ?? 0))
      }
    })
  }

  // Ordem dos dims
  const dimOrder = [...new Set(rows.map(r => String(r[dimKey] ?? r[dk] ?? '')))]
  dimOrder.sort((a, b) => dir * ((valueMap.get(a) ?? 0) - (valueMap.get(b) ?? 0)))
  const posMap = new Map(dimOrder.map((d, i) => [d, i]))

  return rows.slice().sort((a, b) => {
    const pa = posMap.get(String(a[dimKey] ?? a[dk] ?? '')) ?? 0
    const pb = posMap.get(String(b[dimKey] ?? b[dk] ?? '')) ?? 0
    return pa - pb
  })
}

// ─── Bloco 1: Sequência de Vendas ────────────────────────────
// Pivot: Cliente (nível 0) ou Pedido (nível 1) × Mês/Ano
// Usa SOMENTE BI_FATURAMENTO — sem JOIN com BI_CLIENTE.
// CAMPO_ADICIONAL removido da query principal (era causa de erro silencioso).
router.get('/buraco-vendas/sequencia', async (req, res, next) => {
  try {
    const nivel    = Number(req.query.nivel || 0)
    const sortCol  = req.query.sort_col ?? null          // 'nome' | 'YYYY-MM' | null
    const sortDir  = req.query.sort_dir === 'desc' ? 'desc' : 'asc'

    const { where, params, campoData } = buildFiltersForAlias(req.query, 'FAT')

    // Drill: nível 0→1 filtra por cliente específico
    if (req.query.drill_cod_cliente) {
      where.push('FAT.COD_CLIENTE = ?')
      params.push(Number(req.query.drill_cod_cliente))
    }

    const w = toWhere(where)

    let sql, labelKey, valueKey, maxRows

    if (nivel === 1) {
      // Nível 1 = folha (Pedido) — sem expansão
      labelKey = 'DIM_LABEL'; valueKey = 'DIM_LABEL'; maxRows = 200
      // Pedidos: ordenação sempre por label (COD_DOC)
      const dir = sortDir.toUpperCase()
      sql = `
        SELECT
          CAST(FAT.COD_DOC AS VARCHAR(30)) AS dim_label,
          EXTRACT(YEAR  FROM ${campoData}) AS ano,
          EXTRACT(MONTH FROM ${campoData}) AS mes,
          ROUND(SUM(FAT.QTDE), 2)          AS quantidade,
          ROUND(SUM(FAT.TOTAL_DOCIT), 2)   AS total
        FROM BI_FATURAMENTO FAT
        ${w}
        GROUP BY FAT.COD_DOC,
                 EXTRACT(YEAR  FROM ${campoData}),
                 EXTRACT(MONTH FROM ${campoData})
        ORDER BY dim_label ${dir}, ano, mes
        ROWS 1 TO ${maxRows}
      `
    } else {
      // Nível 0 = Cliente — somente BI_FATURAMENTO, sem JOIN
      labelKey = 'DIM_LABEL'; valueKey = 'DIM_VALUE'; maxRows = 300
      // Ordenação por nome via SQL; por período será feita em JS após a query
      const sqlOrderBy = (!sortCol || sortCol === 'nome')
        ? `dim_label ${sortDir.toUpperCase()}, ano, mes`
        : `dim_label ASC, ano, mes`   // fallback neutro; JS vai reordenar por período
      sql = `
        SELECT
          FAT.COD_CLIENTE                  AS dim_value,
          TRIM(FAT.NOM_PESS)               AS dim_label,
          EXTRACT(YEAR  FROM ${campoData}) AS ano,
          EXTRACT(MONTH FROM ${campoData}) AS mes,
          ROUND(SUM(FAT.QTDE), 2)          AS quantidade,
          ROUND(SUM(FAT.TOTAL_DOCIT), 2)   AS total
        FROM BI_FATURAMENTO FAT
        ${w}
        GROUP BY FAT.COD_CLIENTE,
                 FAT.NOM_PESS,
                 EXTRACT(YEAR  FROM ${campoData}),
                 EXTRACT(MONTH FROM ${campoData})
        ORDER BY ${sqlOrderBy}
        ROWS 1 TO ${maxRows}
      `
    }

    let rows = await query(sql, params)

    if (rows.length === 0) {
      console.log('[sequencia] rows vazio — SQL:', sql.replace(/\s+/g, ' ').trim(), '| params:', params)
    }

    // Sort pós-query: total, total por período (nome já foi resolvido no ORDER BY SQL)
    if (nivel === 0 && sortCol && sortCol !== 'nome') {
      rows = sortRowsByCol(rows, 'DIM_VALUE', sortCol, sortDir)
    }

    // ── CAMPO_ADICIONAL: query separada e opcional em BI_CLIENTE ──
    // Só executada no nível 0 (Cliente) quando há resultados.
    // Se a coluna ou tabela não existir, falha silenciosamente.
    const campoAdicionalMap = new Map()
    if (nivel !== 1 && rows.length > 0) {
      const codigos = [...new Set(
        rows.map(r => Number(r.DIM_VALUE ?? r.dim_value)).filter(v => v > 0)
      )]
      if (codigos.length > 0) {
        const placeholders = codigos.map(() => '?').join(', ')
        try {
          const cliRows = await query(
            `SELECT COD_CLIENTE, TRIM(CAMPO_ADICIONAL) AS campo_adicional
               FROM BI_CLIENTE
              WHERE COD_CLIENTE IN (${placeholders})`,
            codigos,
          )
          cliRows.forEach(c => {
            const cod = Number(c.COD_CLIENTE ?? c.cod_cliente)
            const ca  = c.CAMPO_ADICIONAL ?? c.campo_adicional ?? ''
            campoAdicionalMap.set(cod, String(ca).trim())
          })
        } catch {
          // BI_CLIENTE ou CAMPO_ADICIONAL indisponível — continua sem o campo
        }
      }
    }

    const lk = labelKey.toLowerCase()
    const vk = valueKey.toLowerCase()

    // Remove prefixo numérico com separador do nome (ex: "00042 - EMPRESA XPTO" → "EMPRESA XPTO")
    // Exige traço como separador para não cortar nomes que começam com dígito.
    const stripCodePrefix = (s) => String(s ?? '').trim().replace(/^\d+\s*[-–]\s*/, '').trim()

    res.json({
      nivel,
      maxNivel: 1,
      rows: rows.map(r => {
        const cod = Number(r.DIM_VALUE ?? r.dim_value ?? 0)
        const rawLabel = r[labelKey] ?? r[lk] ?? ''
        return {
          label:          nivel === 0 ? stripCodePrefix(rawLabel) : String(rawLabel).trim(),
          value:          r[valueKey] ?? r[vk] ?? '',
          ano:            Number(r.ANO        ?? r.ano        ?? 0),
          mes:            Number(r.MES        ?? r.mes        ?? 0),
          quantidade:     Number(r.QUANTIDADE ?? r.quantidade ?? 0),
          total:          Number(r.TOTAL      ?? r.total      ?? 0),
          campoAdicional: campoAdicionalMap.get(cod) ?? '',
        }
      }),
    })
  } catch (err) { next(err) }
})

// ─── Bloco 2: Estoque por Faturamento ────────────────────────
// Mesma estrutura do endpoint /estoque/faturamento-matriz,
// mas com filtros completos (cliente, vendedor, uf, mercado, etc.)
// Níveis: 0=Material  1=Unidade  2=Cliente  3=Pedido
router.get('/buraco-vendas/estoque-faturamento', async (req, res, next) => {
  try {
    const nivel   = Number(req.query.nivel || 0)
    const sortCol = req.query.sort_col ?? null
    const sortDir = req.query.sort_dir === 'desc' ? 'desc' : 'asc'

    const { where, params, campoData } = buildFiltersForAlias(req.query, 'FAT')

    // Drill params
    if (req.query.drill_cod_ma)      { where.push('FAT.COD_MA = ?');       params.push(Number(req.query.drill_cod_ma)) }
    if (req.query.drill_unidade)     { where.push('FAT.UNIDADE = ?');       params.push(String(req.query.drill_unidade)) }
    if (req.query.drill_cod_cliente) { where.push('FAT.COD_CLIENTE = ?');   params.push(Number(req.query.drill_cod_cliente)) }

    const w = toWhere(where)

    let selectCols, groupBy, labelKey, valueKey, dimKey

    switch (nivel) {
      case 0:
        selectCols = `FAT.COD_MA, IIF(MA.MATERIAL IS NOT NULL, MA.MATERIAL, FAT.MATERIAL) AS dim_label`
        groupBy    = `FAT.COD_MA, IIF(MA.MATERIAL IS NOT NULL, MA.MATERIAL, FAT.MATERIAL)`
        labelKey   = 'DIM_LABEL'; valueKey = 'COD_MA'; dimKey = 'COD_MA'
        break
      case 1:
        selectCols = `FAT.UNIDADE AS dim_label`
        groupBy    = `FAT.UNIDADE`
        labelKey   = 'DIM_LABEL'; valueKey = 'DIM_LABEL'; dimKey = 'DIM_LABEL'
        break
      case 2:
        selectCols = `FAT.COD_CLIENTE, TRIM(FAT.NOM_PESS) AS dim_label`
        groupBy    = `FAT.COD_CLIENTE, TRIM(FAT.NOM_PESS)`
        labelKey   = 'DIM_LABEL'; valueKey = 'COD_CLIENTE'; dimKey = 'COD_CLIENTE'
        break
      case 3:
      default:
        selectCols = `CAST(FAT.COD_DOC AS VARCHAR(30)) AS dim_label`
        groupBy    = `FAT.COD_DOC`
        labelKey   = 'DIM_LABEL'; valueKey = 'DIM_LABEL'; dimKey = 'DIM_LABEL'
    }

    const sqlOrderBy = (!sortCol || sortCol === 'nome')
      ? `dim_label ${sortDir.toUpperCase()}, ano, mes`
      : `dim_label ASC, ano, mes`

    const sql = `
      SELECT
        ${selectCols},
        EXTRACT(YEAR  FROM ${campoData}) AS ano,
        EXTRACT(MONTH FROM ${campoData}) AS mes,
        ROUND(SUM(FAT.QTDE), 2)          AS quantidade,
        ROUND(SUM(FAT.TOTAL_DOCIT), 2)   AS total
      FROM BI_FATURAMENTO FAT
      LEFT JOIN BI_MATERIAL MA ON MA.COD_MA = FAT.COD_MA
      ${w}
      GROUP BY ${groupBy},
               EXTRACT(YEAR  FROM ${campoData}),
               EXTRACT(MONTH FROM ${campoData})
      ORDER BY ${sqlOrderBy}
      ROWS 1 TO 500
    `

    let rows = await query(sql, params)

    if (sortCol && sortCol !== 'nome') {
      rows = sortRowsByCol(rows, dimKey, sortCol, sortDir)
    }

    const lk = labelKey.toLowerCase()
    const vk = valueKey.toLowerCase()

    res.json({
      nivel,
      maxNivel: 3,
      rows: rows.map(r => ({
        label:      String(r[labelKey] ?? r[lk] ?? '').trim(),
        value:      r[valueKey] ?? r[vk] ?? '',
        ano:        Number(r.ANO        ?? r.ano        ?? 0),
        mes:        Number(r.MES        ?? r.mes        ?? 0),
        quantidade: Number(r.QUANTIDADE ?? r.quantidade ?? 0),
        total:      Number(r.TOTAL      ?? r.total      ?? 0),
      })),
    })
  } catch (err) { next(err) }
})

// ─── Bloco 3: Materiais Comprados ────────────────────────────
// Tabela flat: material × métricas do período
router.get('/buraco-vendas/materiais-comprados', async (req, res, next) => {
  try {
    const { where, params } = buildFiltersForAlias(req.query, 'FAT')
    const w = toWhere(where)

    const sqlJoin = `
      SELECT
        FAT.COD_MA                                                                       AS material_id,
        IIF(MA.MATERIAL IS NOT NULL, MA.MATERIAL, FAT.MATERIAL)                          AS material,
        FAT.COD_GRP                                                                      AS cod_grp,
        MAX(FAT.DATA_EMISAO)                                                             AS ultima_venda,
        ROUND(SUM(CASE WHEN FAT.UNIDADE = 'M2' THEN FAT.QTDE   ELSE 0 END), 2)          AS qtde_m2,
        ROUND(SUM(CASE WHEN FAT.UNIDADE = 'M3' THEN FAT.QTDE   ELSE 0 END), 2)          AS qtde_m3,
        SUM(FAT.QTDE_PC)                                                                 AS qtde_pc,
        COUNT(DISTINCT FAT.COD_DOC)                                                      AS num_pedidos,
        ROUND(SUM(FAT.TOTAL_DOCIT), 2)                                                   AS total_faturado
      FROM BI_FATURAMENTO FAT
      LEFT JOIN BI_MATERIAL MA ON MA.COD_MA = FAT.COD_MA
      ${w}
      GROUP BY FAT.COD_MA, IIF(MA.MATERIAL IS NOT NULL, MA.MATERIAL, FAT.MATERIAL), FAT.COD_GRP
      ORDER BY ultima_venda DESC
      ROWS 1 TO 300
    `

    let rows
    try {
      rows = await query(sqlJoin, params)
    } catch {
      // Fallback sem JOIN se BI_MATERIAL não existir
      const sqlFallback = `
        SELECT
          FAT.COD_MA                                                                AS material_id,
          FAT.MATERIAL                                                              AS material,
          FAT.COD_GRP                                                               AS cod_grp,
          MAX(FAT.DATA_EMISAO)                                                      AS ultima_venda,
          ROUND(SUM(CASE WHEN FAT.UNIDADE = 'M2' THEN FAT.QTDE ELSE 0 END), 2)    AS qtde_m2,
          ROUND(SUM(CASE WHEN FAT.UNIDADE = 'M3' THEN FAT.QTDE ELSE 0 END), 2)    AS qtde_m3,
          SUM(FAT.QTDE_PC)                                                          AS qtde_pc,
          COUNT(DISTINCT FAT.COD_DOC)                                               AS num_pedidos,
          ROUND(SUM(FAT.TOTAL_DOCIT), 2)                                            AS total_faturado
        FROM BI_FATURAMENTO FAT
        ${w}
        GROUP BY FAT.COD_MA, FAT.MATERIAL, FAT.COD_GRP
        ORDER BY ultima_venda DESC
        ROWS 1 TO 300
      `
      rows = await query(sqlFallback, params)
    }

    const nv = (v) => Number(v ?? 0)
    const sv = (v) => String(v ?? '').trim()

    res.json(rows.map(r => ({
      materialId:    nv(r.MATERIAL_ID   ?? r.material_id),
      material:      sv(r.MATERIAL      ?? r.material),
      codGrp:        r.COD_GRP          ?? r.cod_grp ?? null,
      ultimaVenda:   r.ULTIMA_VENDA     ?? r.ultima_venda ?? null,
      qtdeM2:        nv(r.QTDE_M2       ?? r.qtde_m2),
      qtdeM3:        nv(r.QTDE_M3       ?? r.qtde_m3),
      qtdePc:        nv(r.QTDE_PC       ?? r.qtde_pc),
      numPedidos:    nv(r.NUM_PEDIDOS   ?? r.num_pedidos),
      totalFaturado: nv(r.TOTAL_FATURADO ?? r.total_faturado),
    })))
  } catch (err) { next(err) }
})

module.exports = router
