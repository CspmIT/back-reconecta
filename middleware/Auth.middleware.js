const jwt = require('jsonwebtoken')
const { getUser } = require('../services/UserService')
const secret = process.env.SECRET
const verifyToken = async (req, res, next) => {
	try {
		const token = req.cookies.token
		// Verifico que el token exista
		if (!token) {
			throw new Error('No se ha enviado el token')
		}
		const decoded = jwt.verify(token, secret)
		if (!new Date(decoded.exp) > new Date()) {
			throw new Error('El token ha expirado')
		}
		const user = await getUser(decoded.sub)
		if (!user) {
			throw new Error('El usuario ya no existe o fue suspendido')
		}
		req.user = { id: user.id }
		next()
	} catch (err) {
		res.status(400).json({ message: err.message })
	}
}

module.exports = { verifyToken }
