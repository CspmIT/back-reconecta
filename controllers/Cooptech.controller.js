const { signTokenCooptech, getEnabledUser, signTokenCooptechExternal } = require('../services/AuthService')
const { addUserCooptech } = require('../services/CooptechService')

const relationUserCooptech = async (req, res) => {
	try {
		const { name, last_name, dni, email, token, profile } = req.body
		if (!name && !last_name && !dni && !email && !token && !profile)
			throw new Error('se deben pasar todo los campos (nombre, apellido, dni, email y token)')
		const result = await addUserCooptech(req.body)
		return res.status(200).json(result)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const loginCooptech = async (req, res) => {
	try {
		const { email, tokenApp, schemaName, influx_name } = req.body
		const user = await getEnabledUser(email, schemaName)
		if (!user) {
			throw new Error('El usuario o la contraseña son incorrectas')
		}
		if (user.status == 0) {
			throw new Error('El usuario no tiene Permisos para ingresar')
		}
		if (user.token_app !== tokenApp) {
			throw new Error('El usuario o la contraseña son incorrectas2')
		}
		const token = await signTokenCooptech(user, tokenApp, schemaName, influx_name)
		return res.status(200).json({ token })
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const loginCooptechExternal = async (req, res) => {
	try {
		const { email, tokenApp, schemaName, influx_name, cliente, id_user, tokenCooptech } = req.body
		const user = await getEnabledUser(email, schemaName)
		if (!user) {
			throw new Error('El usuario o la contraseña son incorrectas')
		}
		if (user.status == 0) {
			throw new Error('El usuario no tiene Permisos para ingresar')
		}
		if (user.token_app !== tokenApp) {
			throw new Error('El usuario o la contraseña son incorrectas2')
		}
		const token = await signTokenCooptechExternal(
			user,
			tokenApp,
			schemaName,
			influx_name,
			cliente,
			id_user,
			tokenCooptech
		)
		return res.status(200).json({ token })
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
module.exports = {
	relationUserCooptech,
	loginCooptech,
	loginCooptechExternal,
}
