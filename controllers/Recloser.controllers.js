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
		recloser.dataValues.brand = await brandRecloser(recloser.type_recloser)
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
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const recloser = await getRecloserId(id)
		if (!recloser) {
			return res.status(404).json({ message: 'Reconectador no encontrado' })
		}
		recloser.dataValues.brand = await brandRecloser(recloser.type_recloser)
		const data = {
			brand: recloser.dataValues.brand,
			serial: recloser.serial,
		}
		const dataInflux = await dataRecloseInflux(data)
		const dataReturn = {
			recloser: recloser,
			instantaneo: dataInflux,
		}
		res.status(200).json(dataReturn)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

module.exports = {
	listAllRecloser,
	getRecloserxID,
	getDataInfluxRecloser,
}
