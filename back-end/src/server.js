/**
 * server.js — VERSÃO ATUALIZADA
 *
 * ATENÇÃO: A ordem de registro das rotas importa!
 * app.use(cors()) e app.use(express.json()) devem vir ANTES das rotas.
 */

const express = require('express')
const cors    = require('cors')
require('dotenv').config()

const app = express()

// ─── Middlewares PRIMEIRO ────────────────────────────────────
app.use(cors({ origin: true }))
app.use(express.json())

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }))

// ─── Rotas ────────────────────────────────────────────────────
const analyticsRoutes  = require('./routes/analytics')   // /api/analytics/*
const faturamentoRoutes = require('./routes/faturamento') // /api/faturamento
const clientesRoutes   = require('./routes/clientes')     // /api/clientes
const filtrosRoutes    = require('./routes/filtros')      // /api/filtros/*
const usuariosRoutes   = require('./routes/usuarios')     // /api/usuarios/*
const estoqueRoutes      = require('./routes/estoque')       // /api/estoque/*
const buracoVendasRoutes = require('./routes/buraco-vendas') // /api/buraco-vendas/*

app.use('/api', analyticsRoutes)
app.use('/api', faturamentoRoutes)
app.use('/api', clientesRoutes)
app.use('/api', filtrosRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api', estoqueRoutes)
app.use('/api', buracoVendasRoutes)

// ─── Error handler global ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('ERRO:', err)
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: err?.message || 'Erro interno',
  })
})

const port = Number(process.env.PORT || 3001)
app.listen(port, '0.0.0.0', () => {
  console.log(`API rodando em http://localhost:${port}`)
  console.log(`Endpoints disponíveis:`)
  console.log(`  GET /api/analytics/kpi`)
  console.log(`  GET /api/analytics/por-ano`)
  console.log(`  GET /api/analytics/top-clientes`)
  console.log(`  GET /api/analytics/top-materiais`)
  console.log(`  GET /api/analytics/top-vendedores`)
  console.log(`  GET /api/analytics/por-grupo`)
  console.log(`  GET /api/filtros/anos`)
  console.log(`  GET /api/filtros/clientes`)
  console.log(`  GET /api/filtros/vendedores`)
})
