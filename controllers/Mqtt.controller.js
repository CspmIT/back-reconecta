const mqtt = require('mqtt')
const { saveSendActionMQTT } = require('../services/SendMqttServices')
const { getConectionMqtt } = require('../services/MqttService')

const sendMQTT = async (req, res) => {
	try {
		if (!req.body.action || !req.body.brand || !req.body.serial) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		const configMqtt = await getConectionMqtt()
		const client = mqtt.connect(configMqtt)
		client.on('connect', () => {
			// Publicar en el tópico
			client.publish(
				`coop/energia/Reconectadores/${req.body.brand}/${req.body.serial}/action`,
				req.body.action,
				async (err) => {
					if (!err) {
						const data = { ...req.body, id_user: req.user.id, status: 1 }
						const result = await saveSendActionMQTT(data)
						res.status(200).json({ message: 'Se envio correctamente la accion' })
					} else {
						return res.status(403).json({ message: err.message })
					}
				}
			)
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
const sendMqttMessagge = async (req, res) => {
	try {
		if (!req.body.url || !req.body.brand || !req.body.serial || !req.body.data) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		const configMqtt = await getConectionMqtt()
		const client = mqtt.connect(configMqtt)
		client.on('connect', () => {
			// Publicar en el tópico
			client.publish(
				`coop2/energia/Reconectadores/${req.body.brand}/${req.body.serial}/${req.body.url}`,
				req.body.data,
				async (err) => {
					if (!err) {
						// const data = { ...req.body, id_user: req.user.id, status: 1 }
						// const result = await saveSendActionMQTT(data)
						res.status(200).json({ message: 'Se envio correctamente la accion' })
					} else {
						return res.status(403).json({ message: err.message })
					}
				}
			)
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

module.exports = { sendMQTT, sendMqttMessagge }
