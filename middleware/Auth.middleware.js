const jwt = require('jsonwebtoken')
const { getUser } = require('../services/AuthService')
const { changeSchema } = require('../models')
const secret = process.env.SECRET
const verifyToken = async (req, res, next) => {
	try {
		const token = req.cookies.token || req.headers?.authorization?.slice(7)
		// Verifico que el token exista
		if (!token) {
			throw new Error('No se ha enviado el token')
		}
		const decoded = jwt.verify(token, secret)
		if (!new Date(decoded.exp) > new Date()) {
			throw new Error('El token ha expirado')
		}
		await changeSchema(decoded.iss.substring(4))
		const user = await getUser(decoded.sub)
		if (!user) {
			throw new Error('El usuario ya no existe o fue suspendido')
		}
		req.user = { id: user.id, influx_name: decoded.influx_name, name_coop: decoded.nameApp }
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

		const TOKEN_ESPERADO = '4x5tmmDA6fDIJJBSsAEfSwPJlr54QV2GEI0sGZ11roRXglA8q47lVV7P9tlkj6T5'
		if (token !== TOKEN_ESPERADO) {
			return res.status(403).json({ error: 'Token inválido' })
		}

		next()
	} catch (e) {
		res.status(400).json({ message: e.message })
	}
}

module.exports = { verifyToken, alarmToken }
