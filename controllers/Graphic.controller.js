const { saveAllSunBurst, getListGraphics } = require('../services/GraphicService')

const saveSunBurst = async (req, res) => {
	try {
		const graphic = {
			name: req.body.name,
			type: req.body.type,
			unit: req.body.unit,
			status: 1,
		}
		const { data } = req.body
		const response = await saveAllSunBurst(graphic, data)
		return res.status(200).json(response)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const getSunBurst = async (req, res) => {
	try {
		const graphic = await getListGraphics()
		return res.status(200).json(graphic)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	saveSunBurst,
	getSunBurst,
}
