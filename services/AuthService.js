require('dotenv').config()
const jwt = require('jsonwebtoken')
const { getTenantDb } = require('../models')
const secret = process.env.SECRET

const getEnabledUser = async (email, schemaName) => {
	try {
		const db = await getTenantDb(schemaName)
		const user = await db.User.findOne({ where: { email: email } })
		return user
	} catch (error) {
		throw error
	}
}
// Funcion para firmar el token para usuario interno
const signTokenCooptech = async (user, tokenApp, schemaName, influx_name) => {
	// Seteo de fecha con 8horas mas para expiracion
	const dateHour = new Date().setHours(new Date().getHours() + 8)
	const configSing = {
		iss: `app-${schemaName}`,
		nameApp: schemaName,
		sub: user.id,
		iat: new Date().getTime(),
		exp: new Date(dateHour).getTime(),
		name: user.first_name,
		lastName: user.last_name,
		profile: user.profile,
		dark: user.dark,
		email: user.email,
		token: tokenApp,
		influx_name: influx_name,
		img_profile: user.img_profile,
	}
	return jwt.sign(configSing, secret)
}
// Funcion para firmar el token para usuario interno, que viene desde cooptech
const signTokenCooptechExternal = async (user, tokenApp, schemaName, influx_name, cliente, user_id, tokenCooptech) => {
	// Seteo de fecha con 8horas mas para expiracion
	const dateHour = new Date().setHours(new Date().getHours() + 8)
	const configSing = {
		iss: `app-${schemaName}`,
		nameApp: schemaName,
		sub: user.id,
		iat: new Date().getTime(),
		exp: new Date(dateHour).getTime(),
		name: user.first_name,
		lastName: user.last_name,
		profile: user.profile,
		dark: user.dark,
		email: user.email,
		token: tokenApp,
		influx_name: influx_name,
		img_profile: user.img_profile,
		cliente,
		user_id_cooptech: user_id,
		tokenCooptech: tokenCooptech,
	}
	return jwt.sign(configSing, secret)
}
const getUser = async (db, id) => {
	try {
		const data = await db.User.findOne({ where: { id, status: 1 } })
		if (data) {
			// Clonamos dataValues para no modificar el objeto original
			const result = data.get()
			// Eliminamos los campos que no queremos en el resultado
			//delete result.password
			delete result.token_temp
			delete result.createdAt
			delete result.updatedAt
			// Agrega aquí cualquier otro campo que desees eliminar
			return result
		}
		return null // o manejar como prefieras si el usuario no se encuentra
	} catch (error) {
		throw error
	}
}
module.exports = { getEnabledUser, signTokenCooptech, signTokenCooptechExternal, getUser }
