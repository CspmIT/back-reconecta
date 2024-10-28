const mqtt = require('mqtt')
const { saveSendActionMQTT } = require('../services/SendMqttServices')
const { getConectionMqtt } = require('../services/MqttService')
const testMQTT = async () => {
	const client = mqtt.connect({
		host: '200.63.120.50',
		port: 52883,
		username: 'energia',
		password: 'NojaPower2022',
		protocol: 'mqtt',
		clientId: 'MQTT_COOP',
		clean: true,
	})
	client.on('connect', () => {
		console.log('Conectado al broker MQTT')

		// Publicar en el tópico
		client.publish('coop/energia/Reconectadores/NOJA/031987654321/action', 'Test desde Node', (err) => {
			if (!err) {
				console.log('Mensaje publicado correctamente')
			} else {
				console.error('Error al publicar el mensaje:', err)
			}
		})
		client.end()
	})
	client.on('error', (err) => {
		console.error('Error de conexión:', err.message)
	})
	client.on('close', () => {
		console.log('Cliente desconectado del broker')
	})
}

const sendMQTT = async (req, res) => {
	try {
		if (!req.body.action || !req.body.brand || !req.body.serial || !req.body.id_recloser) {
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

module.exports = { testMQTT, sendMQTT }
