const {
	getAllBinnacles,
	saveBinnacle,
	updateBinnacle: updateBinnacleService,
	deleteBinnacle: deleteBinnacleService,
	getBinnacleEquipos,
} = require('../services/BinnacleService')

const listBinnacle = async (req, res) => {
	try {
		const filters = { ...req.query, ...req.params }
		const binnacles = await getAllBinnacles(req.db, filters)
		return res.status(200).json(binnacles)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addBinnacle = async (req, res) => {
	try {
		const data = await saveBinnacle(req.db, req.body)
		return res.status(200).json({ message: 'Bitácora creada correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const updateBinnacle = async (req, res) => {
	try {
		const { id } = req.params
		const data = await updateBinnacleService(req.db, id, req.body)
		return res.status(200).json({ message: 'Bitácora actualizada correctamente', data })
	} catch (e) {
		if (e.message === 'Registro no encontrado') {
			return res.status(404).json({ message: e.message })
		}
		return res.status(500).json({ message: e.message })
	}
}

const deleteBinnacle = async (req, res) => {
	try {
		const { id } = req.params
		const data = await deleteBinnacleService(req.db, id)
		return res.status(200).json({ message: 'Bitácora eliminada correctamente', data })
	} catch (e) {
		if (e.message === 'Registro no encontrado') {
			return res.status(404).json({ message: e.message })
		}
		return res.status(500).json({ message: e.message })
	}
}

const listEquipos = async (req, res) => {
	try {
		const data = await getBinnacleEquipos(req.db)
		return res.status(200).json(data)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	listBinnacle,
	addBinnacle,
	updateBinnacle,
	deleteBinnacle,
	listEquipos,
}
