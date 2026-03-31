/**
 * sqlFilters.js — helpers para construir WHERE dinâmico no Firebird
 *
 * Suporta:
 *   addEqFilter    → campo = ?          (valor único)
 *   addInFilter    → campo IN (?,?,?)   (array de valores)
 *   addDateRange   → campo BETWEEN ? AND ?
 *   addMonthFilter → EXTRACT(MONTH FROM campo) IN (?,?,?)
 */

/**
 * Filtro de igualdade simples.
 * @param {string[]} where  array de cláusulas
 * @param {any[]}    params array de parâmetros
 * @param {string}   field  nome do campo SQL
 * @param {any}      value  valor recebido do query string
 * @param {Function} cast   Number | String
 */
function addEqFilter(where, params, field, value, cast) {
  if (value === undefined || value === null || value === '') return
  where.push(`${field} = ?`)
  params.push(cast(value))
}

/**
 * Filtro IN — aceita string "1,2,3" ou array [1,2,3].
 * Se só vier um valor, cai em igualdade simples (mais eficiente no Firebird).
 *
 * @param {string[]} where
 * @param {any[]}    params
 * @param {string}   field
 * @param {any}      value   "1,2,3"  |  "5"  |  undefined
 * @param {Function} cast    Number | String
 */
function addInFilter(where, params, field, value, cast) {
  if (value === undefined || value === null || value === '') return

  // Normaliza para array
  const raw = Array.isArray(value) ? value : String(value).split(',')
  const ids = raw
    .map(v => v.toString().trim())
    .filter(v => v !== '')
    .map(cast)

  if (ids.length === 0) return

  if (ids.length === 1) {
    where.push(`${field} = ?`)
    params.push(ids[0])
    return
  }

  const placeholders = ids.map(() => '?').join(', ')
  where.push(`${field} IN (${placeholders})`)
  params.push(...ids)
}

/**
 * Filtro de intervalo de data.
 * @param {string[]} where
 * @param {any[]}    params
 * @param {string}   field     campo da data (ex: "FAT.DATA_EMISAO")
 * @param {string}   data_ini  "YYYY-MM-DD"
 * @param {string}   data_fim  "YYYY-MM-DD"
 */
function addDateRange(where, params, field, data_ini, data_fim) {
  if (data_ini) {
    where.push(`${field} >= ?`)
    params.push(new Date(data_ini))
  }
  if (data_fim) {
    // Inclui o dia inteiro
    const fim = new Date(data_fim)
    fim.setHours(23, 59, 59, 999)
    where.push(`${field} <= ?`)
    params.push(fim)
  }
}

/**
 * Filtro de mês — aceita string "1,2,3" ou array [1,2,3] (meses 1-12).
 * Gera: EXTRACT(MONTH FROM campo) IN (?, ?, ?)
 *
 * @param {string[]} where
 * @param {any[]}    params
 * @param {string}   dateField  campo da data (ex: "DATA_EMISAO")
 * @param {any}      value      "1,3,12" | "6" | undefined
 */
function addMonthFilter(where, params, dateField, value) {
  if (value === undefined || value === null || value === '') return

  const raw = Array.isArray(value) ? value : String(value).split(',')
  const meses = raw
    .map(v => v.toString().trim())
    .filter(v => v !== '')
    .map(Number)
    .filter(n => n >= 1 && n <= 12)

  if (meses.length === 0) return

  if (meses.length === 1) {
    where.push(`EXTRACT(MONTH FROM ${dateField}) = ?`)
    params.push(meses[0])
    return
  }

  const placeholders = meses.map(() => '?').join(', ')
  where.push(`EXTRACT(MONTH FROM ${dateField}) IN (${placeholders})`)
  params.push(...meses)
}

module.exports = { addEqFilter, addInFilter, addDateRange, addMonthFilter }