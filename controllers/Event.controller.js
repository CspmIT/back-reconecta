const mqtt = require('mqtt')
const {
	getAllEvents,
	getEventsActive,
	getEventsInflux,
	getEventsDevice,
	saveEvent,
	updateEventIndex,
	updateEvents,
} = require('../services/EventService')
const { getConectionMqtt } = require('../services/MqttService')
const { addLogsChecks } = require('../services/ChecksAlarmsService')
const { getRecloserId, getEventRecloserOld } = require('../services/RecloserServices')
const { getEquipment } = require('../services/ElementService')
const { uploadFile } = require('../services/SshServices')
const { saveSendActionMQTT } = require('../services/SendMqttServices')
const config_ssh = require(__dirname + '/../config/config_ssh.js')

const getConfigNotify = async (req, res) => {
	try {
		const Events = await getAllEvents(req.db)
		return res.status(200).json(Events)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const saveConfigNotify = async (req, res) => {
	try {
		const Events = await saveEvent(req.db, req.body)
		return res.status(200).json(Events)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const sendConfigMQTT = async (req, res) => {
	try {
		if (!req.body.topic || !req.body.data) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		// console.log(`${req.body.topic}`, JSON.stringify(req.body.data))
		// return res.json(true)
		const configMqtt = await getConectionMqtt(req.db)
		const client = mqtt.connect(configMqtt)
		client.on('connect', () => {
			// Publicar en el tópico
			client.publish(`${req.body.topic}`, JSON.stringify(req.body.data), async (err) => {
				if (!err) {
					console.log('lo envio')
					res.status(200).json(true)
				} else {
					console.log('no envio')
					return res.status(403).json({ message: err.message })
				}
			})
			client.end()
		})
		client.on('error', (err) => {
			return res.status(401).json({ message: err.message })
		})
		client.on('close', () => {
			console.log('Cliente desconectado del broker')
			return
		})
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const AllEvents = async (req, res) => {
	try {
		const Events = await getEventsActive(req.db)
		const eventsInflux = await getEventsInflux(req.db, req.user.influx_name, Events)
		const returnData = eventsInflux
			.reduce((acc, value) => {
				acc.push(...value)
				return acc
			}, [])
			.sort((a, b) => new Date(b.dateAlert) - new Date(a.dateAlert))
			.reduce(
				(acc, value) => {
					acc[value.priority == 1 ? 'alta' : 'baja'].push(value)
					return acc
				},
				{ alta: [], baja: [] }
			)
		return res.status(200).json(returnData)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const eventsDevices = async (req, res) => {
	try {
		const { id, type } = req.query
		if (!id || !type) {
			return res.status(400).json({ message: 'Debe enviar todo los parametros necesarios tanto id como type' })
		}
		//const recloser = await getRecloserId(id)
		const recloser = await getEquipment(req.db, { id })
		const Events = await getEventsDevice(req.db, recloser[0].equipmentmodels.id, 'Reconectador')
		const eventActiveReco = Events.map((item) => {
			return {
				id: item.id,
				id_influx: item.id_event_influx,
				name: item.name,
				priority: item.priority,
				type_var: item.type_var,
				custom: item.customizable,
			}
		})
		const eventsInflux = await getEventRecloserOld(
			{
				serial: recloser[0].serial,
				brand: recloser[0].equipmentmodels.name,
				event: eventActiveReco,
			},
			req.user.influx_name
		)
		const returnData = eventsInflux.sort((a, b) => new Date(b.dateAlert) - new Date(a.dateAlert))

		return res.status(200).json(returnData)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const saveLogsChecks = async (req, res) => {
	try {
		const data = req.body.map((item) => {
			item.id_user = req.user.id
			return item
		})
		const Logs = await addLogsChecks(req.db, data)
		return res.status(200).json(Logs)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

const updateConfigIndex = async (req, res) => {
	try {
		const data = req.body
		const response = await updateEventIndex(req.db, data)
		// Para el archivo que envio por ssh utilizo la hora unix
		const name = '/perfiles_' + new Date().getTime() + '.json'
		await uploadFile(data, name)

		// Envio la configuración a mqtt para que impacte en los recos
		const promises = reclosers.map(async (item) => {
			const path = config_ssh['mqtt_morteros'].SSH_PATH + name
			const data = {
				id_user: req.user.id,
				status: 1,
				action: `UPD_MAP:${path}`,
				serial: item.serial,
				brand: item.equipmentmodels.name,
			}
			await conectionMqtt(data)
		})
		await Promise.all(promises)
		return res.status(200).json(response)
	} catch (e) {
		return res.status(500).json(e)
	}
}

const updateConfigNotify = async (req, res) => {
	try {
		const data = req.body
		const response = await updateEvents(data)
		return res.status(200).json(response)
	} catch (e) {
		return res.status(500).json(e)
	}
}

const conectionMqtt = async (data) => {
	const configMqtt = await getConectionMqtt()

	return new Promise((resolve, reject) => {
		const client = mqtt.connect(configMqtt)

		client.on('connect', () => {
			const topic = `coop/energia/Reconectadores/${data.brand}/${data.serial}/action`

			client.publish(topic, data.action, async (err) => {
				client.end()

				if (err) {
					console.error('Error al publicar:', err.message)
					return reject(err)
				}

				try {
					await saveSendActionMQTT(req.db, data)
					resolve(true)
				} catch (saveError) {
					reject(saveError)
				}
			})
		})

		client.on('error', (err) => {
			client.end()
			reject(err)
		})
	})
}

/* 
FUNCION PARA CARGAR LAS CONFIGURACIONES MEDIANTE EL JSON DE INICIO
const importConfigInitial = async (req, res) => {
	try {
		let dataDb = []
		initialConfig.forEach((item) => {
			const double = item[1] * 2
			const data = {
				index: item[0],
				in: [double, double + 1],
			}
			dataDb.push(data)
		})
		const processData = await Promise.all(await updateEventIndex(dataDb))
		return res.status(200).json(processData)
	} catch (e) {
		return res.status(500).json(e)
	}
} */
module.exports = {
	getConfigNotify,
	saveConfigNotify,
	sendConfigMQTT,
	AllEvents,
	eventsDevices,
	saveLogsChecks,
	updateConfigIndex,
	updateConfigNotify,
}
