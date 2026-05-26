const { getAllPersonal, createPersonal } = require('../services/PersonalService')

const listPersonal = async (req, res) => {
	try {
		const personal = await getAllPersonal(req.db)
		return res.status(200).json(personal)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addPersonal = async (req, res) => {
	try {
		const data = await createPersonal(req.db, req.body)
		return res.status(200).json({ message: 'Personal creado correctamente', data })
	} catch (e) {
		const status = e.message?.includes('obligatorios') ? 400 : 500
		return res.status(status).json({ message: e.message })
	}
}

module.exports = {
	listPersonal,
	addPersonal,
}
