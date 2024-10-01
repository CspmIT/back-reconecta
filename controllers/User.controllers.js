const { db } = require('../models')
const { getAllUser, getAllUserPass, savePassRecloser, getPassxID } = require('../services/UserService')

async function getListUser(req, res) {
	try {
		const listUser = await getAllUser()
		return res.status(200).json(listUser)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

async function getListUserPass(req, res) {
	try {
		const listUser = await getAllUserPass()
		const list = listUser.map((item) => {
			item.dataValues.password = item.passwordRecloser?.password || null
			return item
		})
		return res.status(200).json(list)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

async function getUserPass(req, res) {
	try {
		const userPass = await getPassxID(req.query.id_user)
		return res.status(200).json(userPass)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

const addPassRecloser = async (req, res) => {
	let transaction
	try {
		// Inicia la transacción
		transaction = await db.sequelize.transaction()
		// Validaciones previas
		if (!req.body.password || !req.body.id_user) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		const passRecloser = await savePassRecloser(req.body, transaction)
		if (!passRecloser) throw new Error('Error al guardar la contraseña.')
		// Si todo está bien, se confirma la transacción
		await transaction.commit()
		res.status(200).json(passRecloser)
	} catch (error) {
		// Si ocurre algún error, se revierte la transacción
		if (transaction) await transaction.rollback()
		// Manejo de errores
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
module.exports = {
	getListUser,
	getListUserPass,
	getUserPass,
	addPassRecloser,
}
