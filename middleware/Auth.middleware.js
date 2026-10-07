const jwt = require('jsonwebtoken')
const { getTenantDb } = require('../models')
const { getUser } = require('../services/AuthService')
const { getInfluxConfig } = require('../services/InfluxConfigService')
const secret = process.env.SECRET
const TOKEN_ALARMA = process.env.ALARM_TOKEN
const TOKEN_PROVISION = process.env.PROVISION_TOKEN

const verifyToken = async (req, res, next) => {
	try {
		const token = req.cookies.token || req.headers?.authorization?.slice(7)
		if (!token) throw new Error('No se ha enviado el token')

		const decoded = jwt.verify(token, secret)

		const schema = decoded.iss.substring(4)
		// Cargar db del tenant
		req.db = await getTenantDb(schema)
		const user = await getUser(req.db, decoded.sub)

		if (!user) throw new Error('El usuario no existe')

		req.user = {
			id: user.id,
			// Config de Influx del schema (token propio si ya se cargo en client_products).
			influx: await getInfluxConfig(schema, decoded.influx_name),
			name_coop: decoded.nameApp,
			// El perfil y el schema propio los usa la auditoria para decidir si
			// el usuario puede mirar los datos de otras cooperativas.
			profile: user.profile,
			schema,
		}

		next()
	} catch (err) {
		res.status(400).json({ message: err.message })
	}
}

const alarmToken = async (req, res, next) => {
	try {
		const authHeader = req.headers['authorization']

		if (!authHeader) {
			return res.status(401).json({ error: 'Falta el header Authorization' })
		}

		const parts = authHeader.split(' ')
		if (parts.length !== 2 || parts[0] !== 'Bearer') {
			return res.status(401).json({ error: 'Formato de Authorization inválido' })
		}

		const token = parts[1]

		if (token !== TOKEN_ALARMA) {
			return res.status(403).json({ error: 'Token inválido' })
		}

		next()
	} catch (e) {
		res.status(400).json({ message: e.message })
	}
}

/**
 * Token de servicio para el software administrativo que da de alta clientes.
 * Si PROVISION_TOKEN no esta definido, el endpoint queda deshabilitado.
 */
const provisionToken = (req, res, next) => {
	if (!TOKEN_PROVISION) {
		return res.status(503).json({ error: 'Alta de clientes deshabilitada (falta PROVISION_TOKEN)' })
	}
	const [type, token] = (req.headers['authorization'] || '').split(' ')
	if (type !== 'Bearer' || !token) {
		return res.status(401).json({ error: 'Falta el header Authorization: Bearer <token>' })
	}
	if (token !== TOKEN_PROVISION) {
		return res.status(403).json({ error: 'Token inválido' })
	}
	next()
}

module.exports = { verifyToken, alarmToken, provisionToken }
