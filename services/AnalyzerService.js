const { Op } = require('sequelize')
const { db } = require('../models')
const { ConsultaInflux } = require('./InfluxServices')

const getDataAnalyzer = async (data, influxName = 'morteros_energia') => {
	try {
		const elements = ['acc', 'accio', 'inst', 'onoff']
		const dataReturn = new Map()

		await Promise.all(
			elements.map(async (elem) => {
				const query = `|> range(start: -30m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Analizador/${data.brand}/${data.version}/${data.serial}/${elem}")
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`

				const dataInflux = await ConsultaInflux(query, influxName)
				if (!dataInflux || dataInflux.length === 0) return null

				dataInflux.forEach((element) => {
					if (!dataReturn.has(element._field)) {
						dataReturn.set(element._field, [])
					}
					dataReturn.get(element._field).push({
						field: element._field,
						value: element._value,
						time: element._time,
					})
				})
			})
		)

		return dataReturn
	} catch (error) {
		throw error
	}
}

module.exports = {
	getDataAnalyzer,
}
