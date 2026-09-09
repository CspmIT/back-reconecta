const { getTenantDb } = require('../models')
const { normalizePath, moduleFromPath } = require('../utils/auditModules')

// Los registros se acumulan en memoria y se insertan de a lotes: un INSERT por
// request sumaria una escritura a cada llamada de la API, y el front hace
// polling cada pocos segundos.
const BUFFER_LIMIT = 200
const FLUSH_MS = 5000

// Map<nombreDeDb, { db, rows: [] }>. Se agrupa por tenant porque cada
// cooperativa tiene su propio schema.
const buffers = new Map()
let timer = null

/**
 * Inserta lo acumulado de cada tenant y vacia el buffer.
 *
 * @returns {Promise<void>}
 */
const flush = async () => {
	for (const [name, entry] of buffers) {
		if (!entry.rows.length) continue
		const rows = entry.rows
		entry.rows = []
		try {
			await entry.db.ApiRequest.bulkCreate(rows)
		} catch (error) {
			console.error(`No se pudieron registrar ${rows.length} requests de ${name}:`, error.message)
		}
	}
}

/**
 * Encola un registro y dispara el flush por tamaño o por tiempo.
 *
 * @param {Object} db - Instancia de la db del tenant.
 * @param {Object} row - Fila lista para insertar en `ApiRequests`.
 */
const enqueue = (db, row) => {
	const name = db.sequelize.config.database
	if (!buffers.has(name)) buffers.set(name, { db, rows: [] })
	const entry = buffers.get(name)
	entry.rows.push(row)

	if (entry.rows.length >= BUFFER_LIMIT) {
		flush()
		return
	}
	if (!timer) {
		timer = setTimeout(() => {
			timer = null
			flush()
		}, FLUSH_MS)
		// No mantiene vivo el proceso solo por el buffer de auditoria.
		timer.unref?.()
	}
}

/**
 * Resuelve el tenant del request. En las rutas autenticadas `verifyToken` ya
 * dejo `req.db`; en el login todavia no hay sesion, pero el schema viene en el
 * body, asi que el trafico de login tambien queda registrado.
 *
 * @param {Object} req - Request de express.
 * @returns {Promise<Object|null>} db del tenant, o null si no se pudo resolver.
 */
const resolveDb = async (req) => {
	if (req.db) return req.db
	const schema = req.body?.schemaName
	if (!schema) return null
	try {
		return await getTenantDb(schema)
	} catch {
		return null
	}
}

/**
 * Middleware que registra cada request de la API en `ApiRequests`.
 *
 * Se monta antes de las rutas, pero el registro se arma en el evento `finish`
 * de la respuesta: para entonces ya corrio `verifyToken` y estan disponibles
 * `req.db` y `req.user`.
 *
 * @param {Object} req - Request de express.
 * @param {Object} res - Response de express.
 * @param {Function} next - Siguiente middleware.
 */
const auditRequest = (req, res, next) => {
	const start = process.hrtime.bigint()

	// El mensaje de error viaja en el body de la respuesta; se captura al vuelo
	// para poder mostrarlo en el detalle de errores del dashboard.
	let errorMessage = null
	const originalJson = res.json.bind(res)
	res.json = (body) => {
		if (res.statusCode >= 400 && body) {
			const message = typeof body === 'string' ? body : body.message || body.error || body.errors
			if (message) errorMessage = (typeof message === 'string' ? message : JSON.stringify(message)).slice(0, 255)
		}
		return originalJson(body)
	}

	res.on('finish', async () => {
		try {
			const db = await resolveDb(req)
			if (!db) return
			const path = normalizePath(req.originalUrl)
			enqueue(db, {
				id_user: req.user?.id || null,
				method: req.method,
				path,
				module: moduleFromPath(path),
				status: res.statusCode,
				ms: Number((process.hrtime.bigint() - start) / 1000000n),
				error_message: errorMessage,
				createdAt: new Date(),
			})
		} catch (error) {
			console.error('No se pudo auditar el request:', error.message)
		}
	})

	next()
}

module.exports = { auditRequest, flush }
