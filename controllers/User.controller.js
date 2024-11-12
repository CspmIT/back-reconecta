const { db } = require('../models')
const { getMenus, saveMenu, listPermissionUser, saveMenu_Selected } = require('../services/MenuService')
const { getAllUser, getAllUserPass, savePassRecloser, getPassxID, getAllProfile } = require('../services/UserService')

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

async function getProfiles(req, res) {
	try {
		const listProfile = await getAllProfile()
		return res.status(200).json(listProfile)
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
		console.log(req.body.id)
		if (req.body.id > 0) {
			req.body.id_user_edit = req.user.id
		} else {
			req.body.id_user_create = req.user.id
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

async function getAllMenu(req, res) {
	try {
		const menus = await getMenus()
		return res.status(200).json(menus)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

async function getAllMenu(req, res) {
	try {
		const menus = await getMenus()
		return res.status(200).json(menus)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

async function abmMenu(req, res) {
	let transaction
	try {
		// Inicia la transacción
		transaction = await db.sequelize.transaction()
		// Validaciones previas
		if (!req.body.name || !req.body.level || !req.body.group_menu) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		const Menu = await saveMenu(req.body, transaction)
		if (!Menu) throw new Error('Error al guardar la contraseña.')
		// Si todo está bien, se confirma la transacción
		await transaction.commit()
		res.status(200).json(Menu)
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
async function deleteMenu(req, res) {
	let transaction
	try {
		// Inicia la transacción
		transaction = await db.sequelize.transaction()
		let Menu = true
		for (const element of req.body) {
			// Validaciones previas
			if (!element.name || !element.level || !element.group_menu) {
				return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
			}
			Menu = await saveMenu(element, transaction)
			if (!Menu) throw new Error('Error al guardar la contraseña.')
		}
		// Si todo está bien, se confirma la transacción
		await transaction.commit()
		res.status(200).json(Menu)
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

async function getPermission(req, res) {
	try {
		if (!req.query.type || !req.query.id || !req.query.profile)
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		const menus = await listPermissionUser(req.query)
		return res.status(200).json(menus)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

async function savePermission(req, res) {
	let transaction
	try {
		// Inicia la transacción
		transaction = await db.sequelize.transaction()
		let Menu_selected = true
		for (const element of req.body) {
			// Validaciones previas
			if (!element.id_menu) {
				return res.status(400).json({ message: 'Se solicita enviar el identificador del menu.' })
			}
			Menu_selected = await saveMenu_Selected(element, transaction)
			if (!Menu_selected) throw new Error('Error al guardar la contraseña.')
		}
		// Si todo está bien, se confirma la transacción
		await transaction.commit()
		res.status(200).json(Menu_selected)
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
	getProfiles,
	addPassRecloser,
	getAllMenu,
	abmMenu,
	deleteMenu,
	getPermission,
	savePermission,
}
