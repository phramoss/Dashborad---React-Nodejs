const Firebird = require('node-firebird')
require('dotenv').config()

const fbOptions = {
  host:           process.env.FB_HOST,
  port:           Number(process.env.FB_PORT || 3050),
  database:       process.env.FB_DATABASE,
  user:           process.env.FB_USER,
  password:       process.env.FB_PASSWORD,
  role:           null,
  pageSize:       16384,
  lowercase_keys: true,
  charset:        'WIN1252',
}

const pool = Firebird.pool(10, fbOptions)

console.log('FB_HOST:',     fbOptions.host)
console.log('FB_PORT:',     fbOptions.port)
console.log('FB_DATABASE:', fbOptions.database)
console.log('FB_USER:',     fbOptions.user)
console.log('FB_PASSWORD:', fbOptions.password ? '****' : '(not set)')
console.log('Pool size:    10 connections')

// ─── Correção de encoding ─────────────────────────────────────────────────────
// O node-firebird com WIN1252 pode entregar strings com \uFFFD quando há bytes
// fora do ASCII. Corrige na origem para que todos os endpoints saiam limpos.
function fixStr(value) {
  if (typeof value !== 'string') return value

  // Tenta reinterpretar como latin1→utf8 (caso o driver ignore o charset)
  try {
    const reinterpreted = Buffer.from(value, 'latin1').toString('utf8')
    if ((reinterpreted.match(/\uFFFD/g) || []).length <
        (value.match(/\uFFFD/g) || []).length) {
      value = reinterpreted
    }
  } catch (_) { /* mantém original */ }

  // Remove qualquer \uFFFD restante
  return value.replace(/\uFFFD/g, '').trim()
}

function sanitizeRow(row) {
  if (!row || typeof row !== 'object') return row
  const out = {}
  for (const [key, val] of Object.entries(row)) {
    out[key] = typeof val === 'string' ? fixStr(val) : val
  }
  return out
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(err)

      db.query(sql, params, (err2, result) => {
        db.detach()
        if (err2) return reject(err2)

        const clean = Array.isArray(result)
          ? result.map(sanitizeRow)
          : result

        resolve(clean)
      })
    })
  })
}

module.exports = { query }
