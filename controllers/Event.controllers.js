const { getAllEvents, saveNotify } = require('../services/EventService')

const getConfigNotify = async (req, res) => {
	try {
		const Events = await getAllEvents()
		return res.status(200).json(Events)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const saveConfigNotify = async (req, res) => {
	try {
		console.log(req.body)
		const Events = await saveNotify(req.body)
		return res.status(200).json(Events)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

module.exports = {
	getConfigNotify,
	saveConfigNotify,
}
