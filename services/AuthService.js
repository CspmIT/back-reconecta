require('dotenv').config()
const jwt = require('jsonwebtoken')
const { changeSchema, db } = require('../models')
const secret = process.env.SECRET

// Funcion para firmar el token para pasar por url para logearse desde cooptech
const generateTokenCooptech = async (email, tokenCooptech, schemaName) => {
	// Seteo de fecha con 8horas mas para expiracion
	const dateHour = new Date().setHours(new Date().getHours() + 1)
	const configSing = {
		iss: `app-${schemaName}`,
		iat: new Date().getTime(),
		exp: new Date(dateHour).getTime(),
		email: email,
		token: tokenCooptech,
		schemaName,
	}

	return jwt.sign(configSing, secret)
}
const getEnabledUser = async (email, schemaName) => {
	try {
		await changeSchema(schemaName)
		const user = await db.User.findOne({ where: { email: email } })
		return user
	} catch (error) {
		throw error
	}
}
// Funcion para firmar el token para usuario interno
const signTokenCooptech = async (user, token_app, schemaName) => {
	// Seteo de fecha con 8horas mas para expiracion
	const dateHour = new Date().setHours(new Date().getHours() + 8)
	const configSing = {
		iss: `app-${schemaName}`,
		sub: user.id,
		iat: new Date().getTime(),
		exp: new Date(dateHour).getTime(),
		name: user.first_name,
		lastName: user.last_name,
		profile: user.profile,
		dark: user.dark,
		email: user.email,
		token: token_app,
		img_profile: user.img_profile,
	}
	return jwt.sign(configSing, secret)
}

module.exports = { generateTokenCooptech, getEnabledUser, signTokenCooptech }
