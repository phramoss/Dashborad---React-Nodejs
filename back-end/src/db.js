const Firebird = require('node-firebird')
require('dotenv').config()

const fbOptions = {
  host:           process.env.FB_HOST,
  port:           Number(process.env.FB_PORT || 3050),
  database:       process.env.FB_DATABASE,
  user:           process.env.FB_USER,
  password:       process.env.FB_PASSWORD,
  role:           null,
  pageSize:       16384,   // ✅ era 4096 — page maior reduz I/O em tabelas de BI
  lowercase_keys: true,
  charset:        'UTF8',
}

// ✅ Pool de conexões — evita abrir/fechar conexão a cada query
//    Tamanho 10 cobre bem as 7 requisições paralelas do dashboard
const pool = Firebird.pool(10, fbOptions)

console.log('FB_HOST:',     fbOptions.host)
console.log('FB_PORT:',     fbOptions.port)
console.log('FB_DATABASE:', fbOptions.database)
console.log('FB_USER:',     fbOptions.user)
console.log('FB_PASSWORD:', fbOptions.password ? '****' : '(not set)')
console.log('Pool size:    10 connections')

/**
 * Executa uma query SQL usando uma conexão do pool.
 * A conexão é retornada ao pool após o uso (detach).
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(err)

      db.query(sql, params, (err2, result) => {
        db.detach() // devolve ao pool
        if (err2) return reject(err2)
        resolve(result)
      })
    })
  })
}

module.exports = { query }