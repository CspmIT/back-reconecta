/**
 * Autenticacion de la API externa por token de API (ver ApiTokenService).
 *
 * Deja `req.db` y `req.user` con la misma forma que `verifyToken`, asi los
 * servicios internos y la auditoria funcionan sin saber de donde vino el pedido.
 * `req.user.id` es quien creo el token: el trafico queda auditado a su nombre.
 */
const { resolveToken, touchToken } = require('../services/ApiTokenService')
const { requestInfo } = require('../services/ActionLogService')

/*
 * Limite de pedidos por token, en ventana fija de un minuto. Vive en memoria
 * del proceso: con mas de una replica el limite efectivo se multiplica por la
 * cantidad de replicas. Para una sola instancia alcanza; si se escala hay que
 * pasarlo a un store compartido.
 */
const RATE_LIMIT = Number(process.env.EXTERNAL_API_RATE_LIMIT) || 120
const RATE_WINDOW_MS = 60 * 1000
const counters = new Map()

const rateLimit = (tokenId, res) => {
	const now = Date.now()
	let entry = counters.get(tokenId)
	if (!entry || now >= entry.reset) {
		entry = { count: 0, reset: now + RATE_WINDOW_MS }
		counters.set(tokenId, entry)
	}
	entry.count++
	res.setHeader('X-RateLimit-Limit', RATE_LIMIT)
	res.setHeader('X-RateLimit-Remaining', Math.max(RATE_LIMIT - entry.count, 0))
	res.setHeader('X-RateLimit-Reset', Math.ceil(entry.reset / 1000))
	if (entry.count > RATE_LIMIT) {
		res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000))
		return false
	}
	return true
}

// Los contadores vencidos se limpian cada tanto para no acumular tokens viejos
setInterval(() => {
	const now = Date.now()
	for (const [id, entry] of counters) if (now >= entry.reset) counters.delete(id)
}, 5 * RATE_WINDOW_MS).unref?.()

const apiKeyAuth = async (req, res, next) => {
	try {
		const header = req.headers.authorization || ''
		const [scheme, token] = header.split(' ')
		if (scheme !== 'Bearer' || !token) {
			return res.status(401).json({ error: 'Falta el header Authorization: Bearer <token>' })
		}

		const resolved = await resolveToken(token)
		if (resolved.error) return res.status(401).json({ error: resolved.error })

		const { db, schema, apiToken } = resolved
		if (!rateLimit(apiToken.id, res)) {
			return res.status(429).json({ error: `Se supero el limite de ${RATE_LIMIT} pedidos por minuto` })
		}

		req.db = db
		req.user = {
			id: apiToken.id_user,
			influx_name: apiToken.influx_name,
			schema,
			apiToken: { id: apiToken.id, name: apiToken.name, scopes: apiToken.scopes || [] },
		}
		touchToken(apiToken, requestInfo(req).ip)
		next()
	} catch (e) {
		console.error('apiKeyAuth:', e.message)
		res.status(500).json({ error: 'No se pudo validar el token' })
	}
}

/**
 * Exige un permiso del token. Va despues de `apiKeyAuth`.
 *
 * @param {string} scope - Uno de los valores de SCOPES.
 */
const requireScope = (scope) => (req, res, next) => {
	if (!req.user?.apiToken?.scopes.includes(scope)) {
		return res.status(403).json({ error: `El token no tiene el permiso ${scope}` })
	}
	next()
}

module.exports = { apiKeyAuth, requireScope }
