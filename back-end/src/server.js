const express = require('express')
const cors    = require('cors')
require('dotenv').config()

const app = express()

app.use(cors({ origin: true }))
app.use(express.json())

app.get('/health', (req, res) => res.json({ ok: true }))

const analyticsRoutes    = require('./routes/analytics')
const faturamentoRoutes  = require('./routes/faturamento')
const clientesRoutes     = require('./routes/clientes')
const filtrosRoutes      = require('./routes/filtros')
const usuariosRoutes     = require('./routes/usuarios')
const estoqueRoutes      = require('./routes/estoque')
const buracoVendasRoutes = require('./routes/buraco-vendas')
const simuladorRoutes    = require('./routes/simulador')

app.use('/api', analyticsRoutes)
app.use('/api', faturamentoRoutes)
app.use('/api', clientesRoutes)
app.use('/api', filtrosRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api', estoqueRoutes)
app.use('/api', buracoVendasRoutes)
app.use('/api', simuladorRoutes)

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
})
