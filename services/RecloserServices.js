const { db } = require('../models')
const { consultaprueba } = require('./InfluxServices')

const getAllRecloser = async () => {
	try {
		const RecloserDesarrollo = await db.RecloserDesarrollo.findAll()
		if (!RecloserDesarrollo) throw new Error('No existe ningun reconectador')
		return RecloserDesarrollo
	} catch (error) {
		throw error
	}
}
const getRecloserId = async (id) => {
	try {
		const RecloserDesarrollo = await db.RecloserDesarrollo.findOne({ where: { id: id } })
		if (!RecloserDesarrollo) throw new Error('No existe ningun reconectador')
		return RecloserDesarrollo
	} catch (error) {
		throw error
	}
}
const brandRecloser = async (typeRecloser) => {
	switch (typeRecloser) {
		case 0:
			return 'NOJA'
		case 1:
			return 'COOPER'
		case 2:
			return 'ABM'
		default:
			return ''
	}
}
const dataRecloseInflux = async (data) => {
	console.log(data)
	try {
		const query = `|> range(start: -3m, stop: now())
        |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_bin")
        |> aggregateWindow(every: 1s, fn: last, createEmpty: false)
        |> last()`
		const dataInflux = await consultaprueba(query)
		console.log(dataInflux)
		if (!dataInflux) throw new Error('No existe ningun reconectador')
		return dataInflux
	} catch (error) {
		throw error
	}
}

module.exports = { getAllRecloser, getRecloserId, brandRecloser, dataRecloseInflux }
