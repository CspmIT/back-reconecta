const { getAllUser } = require('../services/UserService')

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
module.exports = {
	getListUser,
}
