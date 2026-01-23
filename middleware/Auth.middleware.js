const jwt = require('jsonwebtoken')
const { getTenantDb } = require('../models')
const { getUser } = require('../services/AuthService')
const secret = process.env.SECRET
const TOKEN_ALARMA = process.env.ALARM_TOKEN

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
			influx_name: decoded.influx_name,
			name_coop: decoded.nameApp,
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

module.exports = { verifyToken, alarmToken }
