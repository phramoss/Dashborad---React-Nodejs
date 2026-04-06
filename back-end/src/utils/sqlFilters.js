/**
 * sqlFilters.js
 *
 * Helpers para construir cláusulas WHERE dinâmicas no Firebird.
 *
 * ADIÇÃO: buildFiltersForAlias(qs, tableAlias)
 *   Constrói os filtros já com alias de tabela, evitando a substituição
 *   regex frágil que existia nos endpoints com JOIN (top-materiais,
 *   por-grupo, mapa-faturamento).
 *
 * ADIÇÃO: filtro de município (mun_pess) — usa subquery em BI_CLIENTE
 *   para filtrar por município em endpoints que só acessam BI_FATURAMENTO.
 */

function addEqFilter(where, params, field, value, cast) {
  if (value === undefined || value === null || value === '') return
  where.push(`${field} = ?`)
  params.push(cast(value))
}

/**
 * Filtro IN — aceita "1,2,3" ou array.
 * Se vier só um valor, usa igualdade simples (mais eficiente no Firebird).
 */
function addInFilter(where, params, field, value, cast) {
  if (value === undefined || value === null || value === '') return

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

function addDateRange(where, params, field, data_ini, data_fim) {
  if (data_ini) {
    where.push(`${field} >= ?`)
    params.push(new Date(data_ini))
  }
  if (data_fim) {
    const fim = new Date(data_fim)
    fim.setHours(23, 59, 59, 999)
    where.push(`${field} <= ?`)
    params.push(fim)
  }
}

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

/**
 * addMunicipioFilter
 *
 * Filtra por município usando subquery em BI_CLIENTE.
 * Aceita "SAO PAULO,CASTELO" ou array.
 * Gera: COD_CLIENTE IN (SELECT COD_CLIENTE FROM BI_CLIENTE WHERE MUN_PESS IN (...))
 *
 * @param {string[]} where
 * @param {any[]}    params
 * @param {string}   codClienteField  ex: "FAT.COD_CLIENTE" ou "COD_CLIENTE"
 * @param {string|undefined} value    ex: "SAO PAULO,CASTELO"
 */
function addMunicipioFilter(where, params, codClienteField, value) {
  if (value === undefined || value === null || value === '') return

  const raw = Array.isArray(value) ? value : String(value).split(',')
  const municipios = raw
    .map(v => v.toString().trim().toUpperCase())
    .filter(v => v !== '')

  if (municipios.length === 0) return

  const placeholders = municipios.map(() => '?').join(', ')
  where.push(
    `${codClienteField} IN (SELECT COD_CLIENTE FROM BI_CLIENTE WHERE UPPER(MUN_PESS) IN (${placeholders}))`
  )
  params.push(...municipios)
}

/**
 * buildFiltersForAlias
 *
 * Versão dos filtros já prefixada com alias de tabela.
 * Use nos endpoints que fazem JOIN (top-materiais, por-grupo, mapa-faturamento).
 *
 * Evita a substituição via regex nos WHERE strings, que é frágil
 * (ex: cliente chamado "COD_CLIENTE LTDA" quebraria o replace).
 *
 * @param {object} qs          req.query
 * @param {string} alias       alias da tabela BI_FATURAMENTO no JOIN (ex: "FAT")
 * @returns {{ where: string[], params: any[], campoData: string }}
 */
function buildFiltersForAlias(qs, alias) {
  const {
    cod_cliente,
    cod_vendedor,
    cod_ma,
    cod_grp,
    mercado,
    pais,
    uf,
    municipio,
    meses,
    data_ini,
    data_fim,
    data_tipo,
  } = qs

  const A = alias ? `${alias}.` : ''
  const where = []
  const params = []

  addInFilter(where, params, `${A}COD_CLIENTE`,  cod_cliente,  Number)
  addInFilter(where, params, `${A}COD_VENDEDOR`, cod_vendedor, Number)
  addInFilter(where, params, `${A}COD_MA`,       cod_ma,       Number)
  addInFilter(where, params, `${A}COD_GRP`,      cod_grp,      Number)
  addInFilter(where, params, `${A}MERCADO`,      mercado,      String)
  addInFilter(where, params, `${A}PAIS`,         pais,         String)
  addInFilter(where, params, `${A}UF`,           uf,           String)

  // Filtro de município via subquery em BI_CLIENTE
  addMunicipioFilter(where, params, `${A}COD_CLIENTE`, municipio)

  const campoData =
    String(data_tipo || 'emissao').toLowerCase() === 'saida'
      ? `${A}DATA_SAIDA`
      : `${A}DATA_EMISAO`

  addDateRange(where, params, campoData, data_ini, data_fim)
  addMonthFilter(where, params, campoData, meses)

  return { where, params, campoData }
}

module.exports = {
  addEqFilter,
  addInFilter,
  addDateRange,
  addMonthFilter,
  addMunicipioFilter,
  buildFiltersForAlias,
}