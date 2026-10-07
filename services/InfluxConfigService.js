const { getTenantDb } = require('../models')
const config_influx = require('../config/config_influx.js')
const { seal, open } = require('../utils/js/secretBox')

/**
 * Resuelve con que Influx habla cada schema.
 *
 * La fuente es cooptech.client_products (fila con schema_name = schema):
 *  - influx_name:   que entrada de config_influx usar (URL y org).
 *  - influx_token:  token propio del schema, cifrado con secretBox.
 *  - influx_bucket: bucket propio del schema (si la columna existe y tiene valor).
 *
 * Mientras un schema no tenga token cargado se usa el token general de
 * config_influx, asi se puede migrar de a una cooperativa.
 */
const COOPTECH_DB = process.env.COOPTECH_DB_NAME || 'cooptech'
const TTL_MS = 5 * 60 * 1000

const cache = new Map()

const fromStaticConfig = (influxName) => {
	const base = config_influx[influxName]
	if (!base) throw new Error(`No hay configuracion de Influx para "${influxName}"`)
	return {
		name: influxName,
		url: base.INFLUX_URL,
		token: base.INFLUXDB_TOKEN,
		org: base.INFLUX_ORG,
		bucket: base.INFLUX_BUCKET,
		ownToken: false,
	}
}

const findClientProduct = async (schema) => {
	const db = await getTenantDb()
	// SELECT * para tomar influx_bucket cuando se agregue la columna sin romper antes.
	const [rows] = await db.sequelize.query(
		`SELECT * FROM \`${COOPTECH_DB}\`.client_products WHERE schema_name = ? ORDER BY status DESC, id DESC LIMIT 1`,
		{ replacements: [schema] }
	)
	return rows[0] || null
}

const build = (row, fallbackName) => {
	const influxName = row?.influx_name || fallbackName
	const influx = fromStaticConfig(influxName)
	if (row?.influx_bucket) influx.bucket = row.influx_bucket
	if (row?.influx_token) {
		try {
			influx.token = open(row.influx_token)
			influx.ownToken = true
		} catch (e) {
			console.error(`InfluxConfig: no se pudo descifrar el token de ${row.schema_name} ->`, e.message)
		}
	}
	return influx
}

/**
 * @param {string} schema - Schema del tenant (el del JWT).
 * @param {string} fallbackName - influx_name del JWT, por si la fila no existe o no lo tiene.
 * @returns {Promise<{name, url, token, org, bucket, ownToken}>}
 */
const getInfluxConfig = async (schema, fallbackName) => {
	const hit = cache.get(schema)
	if (hit && Date.now() - hit.at < TTL_MS) return hit.value

	let row = null
	try {
		row = await findClientProduct(schema)
	} catch (e) {
		// Si cooptech no responde, seguimos con la config general antes que cortar el request.
		console.error(`InfluxConfig: no se pudo leer client_products de ${schema} ->`, e.message)
		return fromStaticConfig(fallbackName)
	}
	const value = build(row, fallbackName)
	cache.set(schema, { at: Date.now(), value })
	return value
}

/**
 * Guarda token (cifrado) y/o bucket de un schema en client_products. Solo se
 * tocan las claves presentes en `access`; un token null lo borra.
 *
 * @returns {Promise<boolean>} false si no hay fila en client_products para ese schema.
 */
const saveInfluxAccess = async (schema, access) => {
	const sets = []
	const values = []
	if ('token' in access) {
		sets.push('influx_token = ?')
		values.push(access.token ? seal(access.token) : null)
	}
	if ('bucket' in access) {
		sets.push('influx_bucket = ?')
		values.push(access.bucket)
	}
	if (!sets.length) return false

	const db = await getTenantDb()
	const [, meta] = await db.sequelize.query(
		`UPDATE \`${COOPTECH_DB}\`.client_products SET ${sets.join(', ')}, updated_at = NOW() WHERE schema_name = ?`,
		{ replacements: [...values, schema] }
	)
	cache.delete(schema)
	return (meta?.affectedRows ?? 0) > 0
}

const hasColumn = async (column) => {
	const db = await getTenantDb()
	const [rows] = await db.sequelize.query(`SHOW COLUMNS FROM \`${COOPTECH_DB}\`.client_products LIKE ?`, {
		replacements: [column],
	})
	return rows.length > 0
}

module.exports = { getInfluxConfig, saveInfluxAccess, findClientProduct, hasColumn, fromStaticConfig }
