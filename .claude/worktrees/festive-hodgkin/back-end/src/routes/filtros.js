/**
 * routes/filtros.js — VERSÃO COM CACHE
 *
 * FIX: /filtros/grupos — coluna NOM_GRP estava sem alias de tabela,
 *      causando ambiguidade no LEFT JOIN com BI_GRUPO.
 *      Agora usa GRP.NOM_GRP explicitamente.
 *
 * PERFORMANCE: Cache em memória de 5 minutos para todos os endpoints.
 * Filtros (clientes, vendedores, materiais, grupos, anos, UFs, mercados)
 * mudam raramente — buscá-los a cada request é desperdício de conexão
 * e tempo de consulta. Com cache, após o primeiro request qualquer
 * requisição subsequente responde em < 1ms.
 */

const express = require('express')
const router  = express.Router()
const { query } = require('../db')

// ─── Cache simples em memória ─────────────────────────────────────────────────
const _cache = new Map()

/**
 * cached(key, ttlMs, fn)
 * Executa fn() e guarda o resultado por ttlMs milissegundos.
 * Requisições seguintes retornam o valor em cache sem tocar no banco.
 */
function cached(key, ttlMs, fn) {
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.ts < ttlMs) return Promise.resolve(hit.data)
  return fn().then(data => {
    _cache.set(key, { data, ts: Date.now() })
    return data
  })
}

const TTL_5MIN  = 5  * 60_000
const TTL_15MIN = 15 * 60_000

// ─── Anos disponíveis ─────────────────────────────────────────
router.get('/filtros/anos', async (req, res, next) => {
  try {
    const rows = await cached('anos', TTL_15MIN, () => query(`
      SELECT DISTINCT EXTRACT(YEAR FROM DATA_EMISAO) AS ano
      FROM BI_FATURAMENTO
      WHERE DATA_EMISAO IS NOT NULL
      ORDER BY ano DESC
    `))
    res.json(rows.map(r => Number(r.ANO || r.ano)))
  } catch (err) { next(err) }
})

// ─── Clientes ─────────────────────────────────────────────────
router.get('/filtros/clientes', async (req, res, next) => {
  try {
    const rows = await cached('clientes', TTL_5MIN, () => query(`
      SELECT DISTINCT
        COD_CLIENTE AS id,
        NOM_PESS    AS label
      FROM BI_FATURAMENTO
      WHERE COD_CLIENTE IS NOT NULL
        AND NOM_PESS    IS NOT NULL
      ORDER BY label
      ROWS 1 TO 500
    `))
    res.json(rows.map(r => ({
      id:    Number(r.ID    || r.id),
      label: String(r.LABEL || r.label || ''),
    })))
  } catch (err) { next(err) }
})

// ─── Vendedores ───────────────────────────────────────────────
router.get('/filtros/vendedores', async (req, res, next) => {
  try {
    const rows = await cached('vendedores', TTL_5MIN, () => query(`
      SELECT DISTINCT
        COD_VENDEDOR AS id,
        IIF(
          VENDEDOR IS NULL OR TRIM(VENDEDOR) = '' OR TRIM(VENDEDOR) = '.',
          'SEM VENDEDOR',
          TRIM(VENDEDOR)
        ) AS label
      FROM BI_FATURAMENTO
      WHERE COD_VENDEDOR IS NOT NULL
      ORDER BY label
      ROWS 1 TO 200
    `))
    res.json(rows.map(r => ({
      id:    Number(r.ID    || r.id),
      label: String(r.LABEL || r.label || ''),
    })))
  } catch (err) { next(err) }
})

// ─── Materiais ────────────────────────────────────────────────
router.get('/filtros/materiais', async (req, res, next) => {
  try {
    const rows = await cached('materiais', TTL_5MIN, async () => {
      try {
        return await query(`
          SELECT COD_MA AS id, MATERIAL AS label
          FROM BI_MATERIAL
          WHERE MATERIAL IS NOT NULL
          ORDER BY label
          ROWS 1 TO 500
        `)
      } catch {
        return await query(`
          SELECT DISTINCT COD_MA AS id, MATERIAL AS label
          FROM BI_FATURAMENTO
          WHERE COD_MA   IS NOT NULL
            AND MATERIAL IS NOT NULL
          ORDER BY label
          ROWS 1 TO 500
        `)
      }
    })
    res.json(rows.map(r => ({
      id:    Number(r.ID    || r.id),
      label: String(r.LABEL || r.label || ''),
    })))
  } catch (err) { next(err) }
})

// ─── Grupos ───────────────────────────────────────────────────
// FIX: GRP.NOM_GRP com alias explícito (antes: NOM_GRP ambíguo no LEFT JOIN)
router.get('/filtros/grupos', async (req, res, next) => {
  try {
    const rows = await cached('grupos', TTL_5MIN, () => query(`
      SELECT DISTINCT
        FAT.COD_GRP   AS id,
        GRP.NOM_GRP   AS label
      FROM BI_FATURAMENTO FAT
      LEFT JOIN BI_GRUPO GRP ON GRP.COD_GRP = FAT.COD_GRP
      WHERE FAT.COD_GRP   IS NOT NULL
        AND GRP.NOM_GRP   IS NOT NULL
      ORDER BY GRP.NOM_GRP
    `))
    res.json(rows.map(r => ({
      id:    Number(r.ID    || r.id),
      label: String(r.LABEL || r.label || `Grupo ${r.ID || r.id}`),
    })))
  } catch (err) { next(err) }
})

// ─── UFs ──────────────────────────────────────────────────────
router.get('/filtros/ufs', async (req, res, next) => {
  try {
    const rows = await cached('ufs', TTL_15MIN, () => query(`
      SELECT DISTINCT UF FROM BI_FATURAMENTO
      WHERE UF IS NOT NULL ORDER BY UF
    `))
    res.json(rows.map(r => r.UF || r.uf))
  } catch (err) { next(err) }
})

// ─── Mercados ─────────────────────────────────────────────────
router.get('/filtros/mercados', async (req, res, next) => {
  try {
    const rows = await cached('mercados', TTL_15MIN, () => query(`
      SELECT DISTINCT MERCADO FROM BI_FATURAMENTO
      WHERE MERCADO IS NOT NULL ORDER BY MERCADO
    `))
    res.json(rows.map(r => r.MERCADO || r.mercado))
  } catch (err) { next(err) }
})

module.exports = router
