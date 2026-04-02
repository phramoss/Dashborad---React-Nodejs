/**
 * routes/filtros.js — VERSÃO COMPLETA
 *
 * Novas rotas:
 *   GET /api/filtros/clientes   → lista de clientes para o dropdown
 *   GET /api/filtros/vendedores → lista de vendedores
 *   GET /api/filtros/materiais  → lista de materiais
 *   GET /api/filtros/grupos     → lista de grupos
 *   GET /api/filtros/anos       → anos disponíveis nos dados
 *
 * Rotas mantidas:
 *   GET /api/filtros/ufs
 *   GET /api/filtros/mercados
 */

const express = require('express')
const router = express.Router()
const { query } = require('../db')

// ─── Anos disponíveis ─────────────────────────────────────────
router.get('/filtros/anos', async (req, res, next) => {
  try {
    const sql = `
      SELECT DISTINCT EXTRACT(YEAR FROM DATA_EMISAO) AS ano
      FROM BI_FATURAMENTO
      WHERE DATA_EMISAO IS NOT NULL
      ORDER BY ano DESC
    `
    const rows = await query(sql)
    res.json(rows.map(r => Number(r.ANO || r.ano)))
  } catch (err) {
    next(err)
  }
})

// ─── Clientes (para dropdown) ─────────────────────────────────
router.get('/filtros/clientes', async (req, res, next) => {
  try {
    const sql = `
      SELECT DISTINCT
        COD_CLIENTE AS id,
        NOM_PESS    AS label
      FROM BI_FATURAMENTO
      WHERE COD_CLIENTE IS NOT NULL
        AND NOM_PESS    IS NOT NULL
      ORDER BY label
      ROWS 1 TO 500
    `
    const rows = await query(sql)
    res.json(rows.map(r => ({
      id:    Number(r.ID    || r.id),
      label: String(r.LABEL || r.label || ''),
    })))
  } catch (err) {
    next(err)
  }
})

// ─── Vendedores ───────────────────────────────────────────────
router.get('/filtros/vendedores', async (req, res, next) => {
  try {
    const sql = `
      SELECT DISTINCT
        COD_VENDEDOR AS id,
        VENDEDOR     AS label
      FROM BI_FATURAMENTO
      WHERE COD_VENDEDOR IS NOT NULL
        AND VENDEDOR     IS NOT NULL
      ORDER BY label
      ROWS 1 TO 200
    `
    const rows = await query(sql)
    res.json(rows.map(r => ({
      id:    Number(r.ID    || r.id),
      label: String(r.LABEL || r.label || ''),
    })))
  } catch (err) {
    next(err)
  }
})

// ─── Materiais ────────────────────────────────────────────────
router.get('/filtros/materiais', async (req, res, next) => {
  try {
    // Tenta usar BI_MATERIAL; fallback para agregar do faturamento
    let rows
    try {
      const sql = `
        SELECT COD_MA AS id, MATERIAL AS label
        FROM BI_MATERIAL
        WHERE MATERIAL IS NOT NULL
        ORDER BY label
        ROWS 1 TO 500
      `
      rows = await query(sql)
    } catch {
      const sql = `
        SELECT DISTINCT COD_MA AS id, MATERIAL AS label
        FROM BI_FATURAMENTO
        WHERE COD_MA   IS NOT NULL
          AND MATERIAL IS NOT NULL
        ORDER BY label
        ROWS 1 TO 500
      `
      rows = await query(sql)
    }

    res.json(rows.map(r => ({
      id:    Number(r.ID    || r.id),
      label: String(r.LABEL || r.label || ''),
    })))
  } catch (err) {
    next(err)
  }
})

// ─── Grupos ───────────────────────────────────────────────────
router.get('/filtros/grupos', async (req, res, next) => {
  try {
    // NOM_GRP vem direto de BI_FATURAMENTO — sem JOIN necessário
    const sql = `
      SELECT DISTINCT
        BI_FATURAMENTO.COD_GRP AS id,
        GRP.NOM_GRP AS label
      FROM BI_FATURAMENTO
      LEFT JOIN BI_GRUPO GRP ON GRP.COD_GRP = BI_FATURAMENTO.COD_GRP
      WHERE BI_FATURAMENTO.COD_GRP IS NOT NULL
        AND NOM_GRP IS NOT NULL
      ORDER BY label
    `
    const rows = await query(sql)
    res.json(rows.map(r => ({
      id:    Number(r.ID    || r.id),
      label: String(r.LABEL || r.label || `Grupo ${r.ID || r.id}`),
    })))
  } catch (err) {
    next(err)
  }
})

// ─── UFs (mantida) ────────────────────────────────────────────
router.get('/filtros/ufs', async (req, res, next) => {
  try {
    const sql = `
      SELECT DISTINCT UF FROM BI_FATURAMENTO
      WHERE UF IS NOT NULL ORDER BY UF
    `
    const rows = await query(sql)
    res.json(rows.map(r => r.UF || r.uf))
  } catch (err) {
    next(err)
  }
})

// ─── Mercados (mantida) ───────────────────────────────────────
router.get('/filtros/mercados', async (req, res, next) => {
  try {
    const sql = `
      SELECT DISTINCT MERCADO FROM BI_FATURAMENTO
      WHERE MERCADO IS NOT NULL ORDER BY MERCADO
    `
    const rows = await query(sql)
    res.json(rows.map(r => r.MERCADO || r.mercado))
  } catch (err) {
    next(err)
  }
})

module.exports = router
