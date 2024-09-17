const { InfluxDB } = require('@influxdata/influxdb-client')
require('dotenv').config()
const config_influx = require(__dirname + '/../config/config_influx.js')

const ConsultaInflux = async (query, influxName) => {
	try {
		console.log(config_influx)
		console.log(influxName)
		console.log(config_influx[influxName])
		const url = config_influx[influxName].INFLUX_URL
		const token = config_influx[influxName].INFLUXDB_TOKEN
		const org = config_influx[influxName].INFLUX_ORG
		const bucket = config_influx[influxName].INFLUX_BUCKET

		// Crea una instancia del cliente
		const influxDB = new InfluxDB({ url, token })

		// Crea una consulta
		const queryApi = influxDB.getQueryApi(org)
		// Escribe tu consulta en Flux
		const fluxQuery = `from(bucket: "${bucket}")
							${query}`

		// Ejecuta la consulta
		return new Promise((resolve, reject) => {
			const results = []
			queryApi.queryRows(fluxQuery, {
				next(row, tableMeta) {
					// Convertir la fila a un objeto
					const record = tableMeta.toObject(row)
					results.push(record)
				},
				error(error) {
					reject(error)
				},
				complete() {
					resolve(results)
				},
			})
		})
	} catch (error) {
		throw new Error(error)
	}
}
module.exports = {
	ConsultaInflux,
}
