const mqtt = require('mqtt')
const {
	getAllEvents,
	saveNotify,
	getEventsActive,
	getEventsInflux,
	getEventsDevice,
} = require('../services/EventService')
const { getConectionMqtt } = require('../services/MqttService')
const { addLogsChecks } = require('../services/ChecksAlarmsService')
const { getRecloserId, getEventRecloserOld } = require('../services/RecloserServices')
const getConfigNotify = async (req, res) => {
	try {
		const Events = await getAllEvents()
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
		const Events = await saveNotify(req.body)
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
		const configMqtt = await getConectionMqtt()
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
		const Events = await getEventsActive()
		const eventsInflux = await getEventsInflux(req.user.influx_name, Events)
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
		const recloser = await getRecloserId(id)
		const Events = await getEventsDevice(recloser.version.id, 'Reconectador')
		const eventActiveReco = Events.map((item) => {
			return { id: item.id_event_influx, name: item.name }
		})
		const eventsInflux = await getEventRecloserOld(
			{
				brand: recloser?.version?.brand?.name,
				serial: recloser?.serial,
				event: eventActiveReco,
			},
			req.user.influx_name
		)
		const returnData = await eventsInflux.sort((a, b) => new Date(b.dateAlert) - new Date(a.dateAlert))

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
		const Logs = await addLogsChecks(data)
		return res.status(200).json(Logs)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
module.exports = {
	getConfigNotify,
	saveConfigNotify,
	sendConfigMQTT,
	AllEvents,
	eventsDevices,
	saveLogsChecks,
}
