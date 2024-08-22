const { InfluxDB } = require('@influxdata/influxdb-client')
require('dotenv').config()
const url = process.env.INFLUX_URL
const token = process.env.INFLUXDB_TOKEN
const org = process.env.INFLUX_ORG
const bucket = process.env.INFLUX_BUCKET

// Crea una instancia del cliente
const influxDB = new InfluxDB({ url, token })

// Crea una consulta
const queryApi = influxDB.getQueryApi(org)

const ConsultaInflux = async (query) => {
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
}
module.exports = {
	ConsultaInflux,
}
