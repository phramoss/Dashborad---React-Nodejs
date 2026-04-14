const express = require('express')
const router  = express.Router()
const { query } = require('../db')
const { addInFilter } = require('../utils/sqlFilters')

// ─── cache simples em memória (5s TTL) ───────────────────────────────────────
const _cache = new Map()
function getCacheKey(prefix, qs) { return prefix + JSON.stringify(qs) }
function getCache(key) {
  const item = _cache.get(key)
  if (!item) return null
  if (Date.now() - item.ts > 5000) { _cache.delete(key); return null }
  return item.data
}
function setCache(key, data) { _cache.set(key, { data, ts: Date.now() }) }

function toWhere(where) {
  return where.length ? `WHERE ${where.join(' AND ')}` : ''
}

function toAnd(where) {
  return where.length ? `AND ${where.join(' AND ')}` : ''
}

function n(v) {
  const x = Number(v ?? 0)
  return isFinite(x) ? x : 0
}

function s(v) { return String(v ?? '') }

// Filtro de situação em PROD (SIT_PROD)
const SIT_MAP = { VENDIDO: 0, RESERVADO: 1, DISPONIVEL: 2 }
function buildSituacaoFilter(qs, alias) {
  const A = alias ? `${alias}.` : ''
  const { situacao } = qs
  if (!situacao) return `${A}SIT_PROD IN (0, 1, 2)`
  const vals = String(situacao).split(',').map(s => s.trim().toUpperCase())
  const nums = vals.map(v => SIT_MAP[v]).filter(n => n !== undefined && n !== null && !isNaN(n))
  if (nums.length === 0) return `${A}SIT_PROD IN (0, 1, 2)`
  return `${A}SIT_PROD IN (${nums.join(', ')})`
}

// Filtros diretos em PROD (COD_MA e BLOCO_PROD)
function buildProdFilters(qs, alias) {
  const { cod_ma, bloco } = qs
  const A = alias ? `${alias}.` : ''
  const where  = []
  const params = []
  addInFilter(where, params, `${A}COD_MA`,     cod_ma, Number)
  addInFilter(where, params, `${A}BLOCO_PROD`, bloco,  Number)
  return { where, params }
}

// /simulador/filtros
// Direto em PROD + MA — evita executar BI_REUSLTADO_BLOCO inteira só para DISTINCT
router.get('/simulador/filtros', async (req, res, next) => {
  try {
    const [matRows, blocoRows] = await Promise.all([
      query(`
        SELECT DISTINCT P.COD_MA AS id, MA.NOM_MA AS label
        FROM PROD P
        INNER JOIN MA ON P.COD_MA = MA.COD_MA
        WHERE P.BLOCO_PROD > 0
          AND P.SIT_PROD IN (0, 1, 2)
          AND P.NAT_ESTQ = 'I'
          AND P.COD_MA IS NOT NULL
        ORDER BY MA.NOM_MA
      `),
      query(`
        SELECT DISTINCT BLOCO_PROD AS N_BLOCO
        FROM PROD
        WHERE BLOCO_PROD > 0
          AND SIT_PROD IN (0, 1, 2)
          AND NAT_ESTQ = 'I'
        ORDER BY BLOCO_PROD
      `),
    ])

    res.json({
      materiais: matRows.map(r => ({
        id:    n(r.id    ?? r.ID),
        label: s(r.label ?? r.LABEL),
      })),
      blocos: blocoRows.map(r => n(r.n_bloco ?? r.N_BLOCO)),
    })
  } catch (err) { next(err) }
})

// /simulador/matriz
// Substitui JOIN entre BI_REUSLTADO_BLOCO e BI_VENDAS por queries diretas nas tabelas
router.get('/simulador/matriz', async (req, res, next) => {
  const cacheKey = getCacheKey('matriz', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const { where: wE, params: pE } = buildProdFilters(req.query, 'P')
    const { where: wV, params: pV } = buildProdFilters(req.query, 'PR')
    const sitFilter = buildSituacaoFilter(req.query, 'P')
    const andE = toAnd(wE)
    const andV = toAnd(wV)

    // pV vai nos parâmetros do subquery de vendas (LEFT JOIN interno), pE na query de estoque
    const allParams = [...pV, ...pE]

    const sql = `
      SELECT
        E.COD_MA,
        E.MATERIAL,
        E.N_BLOCO,
        E.PC,
        COALESCE(V.sum_pc, 0)  AS VENDIDAS,
        E.COMPRA,
        E.FRETE,
        E.SERRADA,
        E.POLIMENTO,
        E.OUTROS_CUSTOS,
        E.OUT_DESP,
        E.SERVICOS,
        E.CUSTO_TOTAL,
        E.METROS_TOTAL
      FROM (
        SELECT
          P.COD_MA,
          MA.NOM_MA                                                   AS MATERIAL,
          P.BLOCO_PROD                                                AS N_BLOCO,
          COUNT(*)                                                    AS PC,
          SUM(COALESCE(P.TOTALG_DOC,   0))                           AS COMPRA,
          SUM(COALESCE(P.FRETE_DOC,    0))                           AS FRETE,
          SUM(COALESCE(P.VRSERR_PROD,  0))                           AS SERRADA,
          SUM(COALESCE(P.VRPOL_PROD,   0))                           AS POLIMENTO,
          SUM(COALESCE(P.VRESTC_PROD,  0))                           AS OUTROS_CUSTOS,
          SUM(COALESCE(P.OUTDESP_DOC,  0))                           AS OUT_DESP,
          SUM(COALESCE(P.VRSERV_PROD,  0))                           AS SERVICOS,
          SUM(
            COALESCE(P.TOTALG_DOC,   0) + COALESCE(P.FRETE_DOC,    0)
            + COALESCE(P.OUTDESP_DOC,  0) + COALESCE(P.VRSERR_PROD,  0)
            + COALESCE(P.VRPOL_PROD,   0) + COALESCE(P.VRCORTE_PROD, 0)
            + COALESCE(P.VRSERV_PROD,  0) + COALESCE(P.VRESTC_PROD,  0)
          )                                                           AS CUSTO_TOTAL,
          SUM(P.COMPLQUNSD_PROD * P.LARGLQUNSD_PROD)                AS METROS_TOTAL
        FROM PROD P
        INNER JOIN MA ON P.COD_MA = MA.COD_MA
        WHERE P.BLOCO_PROD > 0
          AND ${sitFilter}
          AND P.NAT_ESTQ = 'I'
          AND P.CHAPA_PROD > 0
          ${andE}
        GROUP BY P.COD_MA, MA.NOM_MA, P.BLOCO_PROD
      ) E
      LEFT JOIN (
        SELECT
          PR.COD_MA     AS CODIGOMA,
          PR.BLOCO_PROD AS BLOCO,
          SUM(DI.QTDEPC_DOCIT) AS sum_pc
        FROM DOCIT DI
        INNER JOIN PROD PR ON DI.COD_ESTQ = PR.COD_ESTQ
        INNER JOIN DOC  D  ON D.COD_DOC   = DI.COD_DOC
        WHERE PR.BLOCO_PROD > 0
          AND PR.NAT_ESTQ  = 'I'
          AND D.MOV_DOC    = 'S'
          AND D.COD_AIDF   = '-1'
          ${andV}
        GROUP BY PR.COD_MA, PR.BLOCO_PROD
      ) V ON V.CODIGOMA = E.COD_MA AND V.BLOCO = E.N_BLOCO
      ORDER BY E.MATERIAL, E.N_BLOCO
    `

    const rows = await query(sql, allParams)

    const result = {
      rows: rows.map(r => {
        const pc         = n(r.pc          ?? r.PC)
        const vendidas   = n(r.vendidas    ?? r.VENDIDAS)
        const custoTotal = n(r.custo_total ?? r.CUSTO_TOTAL)
        const metros     = n(r.metros_total ?? r.METROS_TOTAL)
        return {
          codMa:       n(r.cod_ma      ?? r.COD_MA),
          material:    s(r.material    ?? r.MATERIAL),
          nBloco:      n(r.n_bloco     ?? r.N_BLOCO),
          vendidas,
          pc,
          pcRestante:  pc - vendidas,
          compra:      n(r.compra      ?? r.COMPRA),
          frete:       n(r.frete       ?? r.FRETE),
          serrada:     n(r.serrada     ?? r.SERRADA),
          polimento:   n(r.polimento   ?? r.POLIMENTO),
          outCustos:   n(r.outros_custos ?? r.OUTROS_CUSTOS),
          outDesp:     n(r.out_desp    ?? r.OUT_DESP),
          servicos:    n(r.servicos    ?? r.SERVICOS),
          custoTotal,
          metrosTotal: metros,
          custoM2:     metros !== 0 ? custoTotal / metros : 0,
        }
      }),
    }
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

// /simulador/vendas
// Usa BI_VENDAS com alias de coluna corretos (BLOCO, CODIGOMA) para filtros
router.get('/simulador/vendas', async (req, res, next) => {
  const cacheKey = getCacheKey('vendas', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const { cod_ma, bloco } = req.query
    const where  = []
    const params = []
    addInFilter(where, params, 'V.CODIGOMA', cod_ma, Number)
    addInFilter(where, params, 'V.BLOCO',    bloco,  Number)
    const w = toWhere(where)

    const sql = `
      SELECT
        V.MATERIAL AS material,
        V.N_PEDIDO AS n_pedido,
        V.BLOCO    AS bloco,
        V.PC       AS pc,
        V.QTDE     AS qtde,
        V.UN       AS un,
        V.PRECO    AS preco,
        V.TOTAL    AS total,
        V.VENDEDOR AS vendedor,
        V.CLIENTE  AS cliente
      FROM BI_VENDAS V
      ${w}
      ORDER BY V.MATERIAL, V.BLOCO, V.N_PEDIDO
    `

    const rows = await query(sql, params)

    const result = {
      rows: rows.map(r => ({
        material: s(r.material ?? r.MATERIAL),
        nPedido:  s(r.n_pedido ?? r.N_PEDIDO),
        bloco:    n(r.bloco    ?? r.BLOCO),
        pc:       n(r.pc       ?? r.PC),
        qtde:     n(r.qtde     ?? r.QTDE),
        un:       s(r.un       ?? r.UN),
        preco:    n(r.preco    ?? r.PRECO),
        total:    n(r.total    ?? r.TOTAL),
        vendedor: s(r.vendedor ?? r.VENDEDOR),
        cliente:  s(r.cliente  ?? r.CLIENTE),
      })),
    }
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

// /simulador/resumo
// Queries diretas em PROD/ESTAB e DOCIT/DOC/PROD — elimina execução das duas views completas
router.get('/simulador/resumo', async (req, res, next) => {
  const cacheKey = getCacheKey('resumo', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const { where: wE, params: pE } = buildProdFilters(req.query, 'P')
    const { where: wV, params: pV } = buildProdFilters(req.query, 'PR')
    const andE = toAnd(wE)
    const andV = toAnd(wV)

    const [rbRows, vRows] = await Promise.all([
      query(`
        SELECT
          SUM(
            COALESCE(P.TOTALG_DOC,   0) + COALESCE(P.FRETE_DOC,    0)
            + COALESCE(P.OUTDESP_DOC,  0) + COALESCE(P.VRSERR_PROD,  0)
            + COALESCE(P.VRPOL_PROD,   0) + COALESCE(P.VRCORTE_PROD, 0)
            + COALESCE(P.VRSERV_PROD,  0) + COALESCE(P.VRESTC_PROD,  0)
          )                                              AS sum_custo_total,
          SUM(P.COMPLQUNSD_PROD * P.LARGLQUNSD_PROD)    AS sum_metros_total,
          COUNT(*)                                       AS sum_pc_bloco,
          MAX(IIF(E.INDPRDV_ESTB  = 0, 0, E.INDPRDV_ESTB  / 100)) AS max_dfixa,
          MAX(IIF(E.INDPRDF_ESTB  = 0, 0, E.INDPRDF_ESTB  / 100)) AS max_dvariavel,
          MAX(IIF(E.INDLUCRO_ESTB = 0, 0, E.INDLUCRO_ESTB / 100)) AS max_lucro
        FROM PROD P
        INNER JOIN ESTAB E ON P.COD_ESTAB = E.COD_ESTAB
        WHERE P.BLOCO_PROD > 0
          AND P.SIT_PROD IN (0, 1, 2)
          AND P.NAT_ESTQ = 'I'
          ${andE}
      `, pE),
      query(`
        SELECT
          SUM(DI.TOTAL_DOCIT)    AS sum_vendas_total,
          SUM(DI.QTDEPC_DOCIT)   AS sum_vendas_pc,
          SUM(DI.QTDE_DOCIT)     AS sum_vendas_qtde
        FROM DOCIT DI
        INNER JOIN PROD PR ON DI.COD_ESTQ = PR.COD_ESTQ
        INNER JOIN DOC  D  ON D.COD_DOC   = DI.COD_DOC
        WHERE PR.BLOCO_PROD > 0
          AND PR.NAT_ESTQ  = 'I'
          AND D.MOV_DOC    = 'S'
          AND D.COD_AIDF   = '-1'
          ${andV}
      `, pV),
    ])

    const rb = rbRows[0] || {}
    const v  = vRows[0]  || {}

    const result = {
      sumCustoTotal:  n(rb.sum_custo_total  ?? rb.SUM_CUSTO_TOTAL),
      sumMetrosTotal: n(rb.sum_metros_total ?? rb.SUM_METROS_TOTAL),
      sumPcBloco:     n(rb.sum_pc_bloco     ?? rb.SUM_PC_BLOCO),
      maxDfixa:       n(rb.max_dfixa        ?? rb.MAX_DFIXA),
      maxDvariavel:   n(rb.max_dvariavel    ?? rb.MAX_DVARIAVEL),
      maxLucro:       n(rb.max_lucro        ?? rb.MAX_LUCRO),
      sumVendasTotal: n(v.sum_vendas_total  ?? v.SUM_VENDAS_TOTAL),
      sumVendasPc:    n(v.sum_vendas_pc     ?? v.SUM_VENDAS_PC),
      sumVendasQtde:  n(v.sum_vendas_qtde   ?? v.SUM_VENDAS_QTDE),
    }
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

// /simulador/chapas
// Retorna chapas individuais com SIT_PROD = 2 (DISPONIVEL) para o Simulador de Pedidos
router.get('/simulador/chapas', async (req, res, next) => {
  const cacheKey = getCacheKey('chapas', req.query)
  const cached = getCache(cacheKey)
  if (cached) return res.json(cached)
  try {
    const { where: wE, params: pE } = buildProdFilters(req.query, 'P')
    const andE = toAnd(wE)

    const sql = `
      SELECT
        P.COD_MA,
        MA.NOM_MA                                                   AS MATERIAL,
        P.BLOCO_PROD                                                AS N_BLOCO,
        P.CHAPA_PROD                                                AS CHAPA,
        COUNT(*)                                                    AS PC,
        SUM(
          COALESCE(P.TOTALG_DOC,   0) + COALESCE(P.FRETE_DOC,    0)
          + COALESCE(P.OUTDESP_DOC,  0) + COALESCE(P.VRSERR_PROD,  0)
          + COALESCE(P.VRPOL_PROD,   0) + COALESCE(P.VRCORTE_PROD, 0)
          + COALESCE(P.VRSERV_PROD,  0) + COALESCE(P.VRESTC_PROD,  0)
        )                                                           AS CUSTO_TOTAL,
        SUM(P.COMPLQUNSD_PROD * P.LARGLQUNSD_PROD)                AS METROS_TOTAL
      FROM PROD P
      INNER JOIN MA ON P.COD_MA = MA.COD_MA
      WHERE P.BLOCO_PROD > 0
        AND P.SIT_PROD = 2
        AND P.NAT_ESTQ = 'I'
        ${andE}
      GROUP BY P.COD_MA, MA.NOM_MA, P.BLOCO_PROD, P.CHAPA_PROD
      ORDER BY MA.NOM_MA, P.BLOCO_PROD, P.CHAPA_PROD
    `

    const rows = await query(sql, pE)

    const result = {
      rows: rows.map(r => {
        const custoTotal = n(r.custo_total ?? r.CUSTO_TOTAL)
        const metros     = n(r.metros_total ?? r.METROS_TOTAL)
        return {
          codMa:       n(r.cod_ma      ?? r.COD_MA),
          material:    s(r.material    ?? r.MATERIAL),
          nBloco:      n(r.n_bloco     ?? r.N_BLOCO),
          chapa:       n(r.chapa       ?? r.CHAPA),
          pc:          n(r.pc          ?? r.PC),
          custoTotal,
          metrosTotal: metros,
          custoM2:     metros !== 0 ? custoTotal / metros : 0,
        }
      }),
    }
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) { next(err) }
})

module.exports = router
