const { getAllRecloser, getRecloserId, dataRecloseInflux, brandRecloser } = require('../services/RecloserServices')

const listAllRecloser = async (req, res) => {
	try {
		const reclosers = await getAllRecloser()
		res.status(200).json(reclosers)
	} catch (error) {
		res.status(400).json(error.message)
	}
}
const getRecloserxID = async (req, res) => {
	try {
		const { id } = req.query
		const recloser = await getRecloserId(id)
		res.status(200).json(recloser)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const getDataInfluxRecloser = async (req, res) => {
	try {
		const { id } = req.query
		const recloser = await getRecloserId(id)
		const data = {
			brand: await brandRecloser(recloser.type_recloser),
			serial: recloser.serial,
		}
		const dataInflux = await dataRecloseInflux(data)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

module.exports = {
	listAllRecloser,
	getRecloserxID,
	getDataInfluxRecloser,
}
