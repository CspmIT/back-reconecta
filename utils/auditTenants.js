/**
 * Resolucion de las cooperativas sobre las que puede consultar la auditoria.
 *
 * El front arma el selector con lo que le responde Cooptech, pero el backend no
 * puede confiar en un schema que llega por query string: antes de abrir una
 * conexion valida el nombre contra esta lista.
 */
const { getTenantDb } = require('../models')

// Perfil habilitado para mirar datos de otras cooperativas. Coincide con la
// fila 'Super Admin' de la tabla Profiles.
const SUPERADMIN_PROFILE = 4

// La lista cambia cuando se da de alta una cooperativa, no entre requests.
const CACHE_MS = 5 * 60 * 1000
let cache = { at: 0, schemas: [] }

/**
 * Cooperativas disponibles. Si DB_NAMES esta definido manda esa lista; si no,
 * se descubren las bases que tengan instalada la auditoria, asi no hay que
 * mantener el .env sincronizado con las altas.
 *
 * @param {Object} db - Cualquier instancia de tenant, para consultar el motor.
 * @returns {Promise<string[]>} Nombres de schema.
 */
const listSchemas = async (db) => {
	const configured = (process.env.DB_NAMES || '')
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean)
	if (configured.length) return configured

	if (Date.now() - cache.at < CACHE_MS) return cache.schemas

	const [rows] = await db.sequelize.query(
		"SELECT TABLE_SCHEMA AS schema_name FROM information_schema.TABLES WHERE TABLE_NAME = 'ApiRequests'"
	)
	cache = { at: Date.now(), schemas: rows.map((row) => row.schema_name) }
	return cache.schemas
}

/**
 * Traduce los parametros del request a la lista de bases a consultar.
 *
 * - sin `schema`            -> la cooperativa del token, para cualquier usuario.
 * - `schema=all`           -> todas, solo para Super Admin.
 * - `schema=<cooperativa>` -> esa, solo para Super Admin (o si es la propia).
 *
 * @param {Object} req - Request de express, ya pasado por verifyToken.
 * @returns {Promise<{ targets: Array<{schema: string, db: Object}>, scope: string }>}
 * @throws {Error} Con `status` 403 si el usuario no puede ver lo que pide.
 */
const resolveTargets = async (req) => {
	const own = req.user.schema
	const requested = req.query.schema

	if (!requested || requested === own) {
		return { targets: [{ schema: own, db: req.db }], scope: 'own' }
	}

	if (req.user.profile !== SUPERADMIN_PROFILE) {
		const error = new Error('No tenés permiso para ver la auditoría de otras cooperativas')
		error.status = 403
		throw error
	}

	const schemas = await listSchemas(req.db)

	if (requested === 'all') {
		// La propia siempre entra, aunque la lista todavia no la incluya.
		const names = schemas.includes(own) ? schemas : [own, ...schemas]
		const targets = await Promise.all(
			names.map(async (schema) => ({
				schema,
				db: schema === own ? req.db : await getTenantDb(schema),
			}))
		)
		return { targets, scope: 'all' }
	}

	if (!schemas.includes(requested)) {
		const error = new Error('La cooperativa solicitada no existe o no tiene auditoría instalada')
		error.status = 404
		throw error
	}

	return { targets: [{ schema: requested, db: await getTenantDb(requested) }], scope: 'schema' }
}

module.exports = { resolveTargets, listSchemas, SUPERADMIN_PROFILE }
