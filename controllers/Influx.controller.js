const { consultaprueba, crearTaskAlerta } = require('../services/InfluxServices')
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

async function influxTask(req, res) {
	try {
		const influx = await crearTaskAlerta()
		return res.status(200).json(influx)
	} catch (e) {
		if (e.errors) {
			res.status(500).json(e.errors)
		} else {
			res.status(400).json(e.message)
		}
	}
}
module.exports = {
	InfluxConection,
	influxTask,
}
