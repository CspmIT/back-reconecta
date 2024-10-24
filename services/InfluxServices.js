const { InfluxDB } = require('@influxdata/influxdb-client')
const crypto = require('crypto')
require('dotenv').config()
const axios = require('axios')
const { TasksAPI } = require('@influxdata/influxdb-client-apis')
const { db } = require('../models')
const config_influx = require(__dirname + '/../config/config_influx.js')

const ConsultaInflux = async (query, influxName) => {
	try {
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

async function createTask(url, token, org, telegramEndpoint) {
	const parameters = `task_data =
    from(bucket: "ENERGIA")
        |> range(start: -1m)
        |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/Alarmas")
        |> filter(fn: (r) => r["_field"] == "t_fall")
        |> aggregateWindow(every: 1m, fn: last, createEmpty: false)
        |> last()
crit = (r) => r["t_fall"] > 0`

	// Llamar a la función createFluxTask para construir la consulta
	const fluxQuery = createFluxTask('Alarma_prueba_Node', '1m', false, 't_fall', parameters, telegramEndpoint, 'crit')

	// Crear el objeto de la tarea
	const TaskData = {
		org,
		flux: fluxQuery,
		status: 'active',
		name: 'Alarma_prueba_Node',
		description: 'task for testing',
	}

	try {
		const response = await axios.post(url, TaskData, {
			headers: {
				Authorization: `Token ${token}`,
				'Content-Type': 'application/json',
			},
		})
		return response.data
	} catch (error) {
		console.error('Error creando la task:', error.response ? error.response.data : error.message)
		return error
	}
}

// Función para crear la consulta de Flux
function createFluxTask(name, every, check_id, field, parameters, endpoint, typeConsult) {
	const consult = `import "strings"
        option task = {name: "${name}", every: ${every}, offset: 0s}
        check = {
            _check_id: "${crypto.randomBytes(8).toString('hex')}", 
            _check_name: "${name}",
            _type: "custom",
            tags: {},
        }
        notification = {
            _notification_rule_id: "${crypto.randomBytes(8).toString('hex')}",
            _notification_rule_name: "Notificacion_${field}_${typeConsult}",
            _notification_endpoint_id: "${crypto.randomBytes(8).toString('hex')}",
            _notification_endpoint_name: "${endpoint}",
        }

        ${parameters}

        messageFn = (r) => "Alerta"
        task_data
            |> schema["fieldsAsCols"]()
            |> filter(fn: (r) => r["_measurement"] == "mqtt_consumer")
            |> monitor["check"](data: check, messageFn: messageFn, crit: crit)
            |> filter(fn: crit)
            |> keep(columns: ["_value", "_time", "_measurement"])
            |> limit(n: 1, offset: 0)
            |> monitor["notify"](
                data: notification,
                endpoint: http.endpoint(url: "${endpoint}")(
                    mapFn: (r) => {
                        body = {r with _version: 1}
                        return {
                            headers: {"Content-Type": "application/json"},
                            data: json.encode(v: body)
                        }
                    }
                )
            )`

	return consult
}
const formaterDataAlarm = async (body, query) => {
	try {
		const arrayOfObjects = body.data.map((item) => {
			const cleanedItem = item.replace(/\n\s*/g, '').replace(/[{}]/g, '')
			const keyValuePairs = cleanedItem.split(',')
			const jsonString = item
			const obj = {}
			keyValuePairs.forEach((pair) => {
				const [key, ...rest] = pair.split(':')
				const value = rest.join(':').trim()
				const cleanedKey = key.trim().replace(/['"]+/g, '')
				let cleanedValue = value
				if (isNaN(value) && !value.includes('"')) {
					cleanedValue = `"${value}"`
				}
				obj[cleanedKey] = JSON.parse(cleanedValue)
			})
			return obj
		})
		return arrayOfObjects
	} catch (error) {
		throw error
	}
}
module.exports = {
	ConsultaInflux,
	createTask,
	formaterDataAlarm,
}
