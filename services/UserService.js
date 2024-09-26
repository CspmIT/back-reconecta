const { db } = require('../models')

const getAllUser = async () => {
	try {
		const listUser = await db.User.findAll({ where: { status: 1 } })
		return listUser
	} catch (error) {
		throw error
	}
}

module.exports = {
	getAllUser,
}
