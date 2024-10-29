const mqtt = require('mqtt')
const { getAllEvents, saveNotify } = require('../services/EventService')
const { getConectionMqtt } = require('../services/MqttService')
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
module.exports = {
	getConfigNotify,
	saveConfigNotify,
	sendConfigMQTT,
}
