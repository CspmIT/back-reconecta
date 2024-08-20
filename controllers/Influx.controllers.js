const { consultaprueba } = require('../services/InfluxServices')
async function InfluxConection(req, res) {
	try {
		const influx = await consultaprueba()
		return res.status(200).json(influx)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
module.exports = {
	InfluxConection,
}
