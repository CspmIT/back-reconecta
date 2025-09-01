const { default: axios } = require('axios')
const fs = require('fs')
const path = require('path')
const { changeSchema } = require('../models')
const { getEquipment } = require('../services/ElementService')
const { checkIsAlarm } = require('../services/EventService')
const { saveAlarm } = require('../services/AlarmService')
const bufferFile = path.join(__dirname, 'cache', 'influx_buffer.json')

// Buffer para no guardar todos las peticiones POST a la vez
function loadBuffer() {
	if (!fs.existsSync(bufferFile)) return {}
	try {
		return JSON.parse(fs.readFileSync(bufferFile, 'utf8'))
	} catch (e) {
		return {}
	}
}

function saveBuffer(buffer) {
	fs.writeFileSync(bufferFile, JSON.stringify(buffer))
}

async function procesarRegistro(topic, values, scheme) {
	try {
		await discord()
		const topicSplit = topic.split('/')
		const serial = topicSplit[4]
		if (scheme === 'morteros') {
			await changeSchema('reconecta_morteros')
			const eventId = values.find((v) => v.field === 'events_0').value
			const info = values.find((v) => v.field === 'info').value
			const eventDate = values.find((v) => v.field === 'events_1').value
			const recloser = await getEquipment({ serial })
			if (!recloser[0] || !eventId) return
			const isAlarm = await checkIsAlarm()
			if (!isAlarm) return
			const body = {
				id_device: recloser[0].id,
				type: 'Reconectador',
				id_event: isAlarm.id,
				info,
				eventDate,
			}
			await saveAlarm(body)
			await discord()
		}
	} catch (e) {
		throw e
	}
}

const influxAlarm = async (req, res) => {
	try {
		await discord()
		const post = req.body
		const { scheme } = req.params
		const fieldsAccepted = ['events_0', 'events_1', 'info']
		const field = post._field ?? null

		if (!post.topic || !post._time || !fieldsAccepted.includes(field)) {
			return res.status(400).json({ error: 'Faltan campos obligatorios' })
		}

		const topic = post.topic
		const time = post._time
		const value = post._value ?? null

		const key = `${topic}-${time}`

		let buffer = loadBuffer()

		if (!buffer[key]) {
			buffer[key] = {
				values: [],
				created_at: Date.now() / 1000,
			}
		}

		buffer[key].values.push({ field, value })

		// Si ya tengo 3 values → proceso de inmediato
		if (buffer[key].values.length === 3) {
			procesarRegistro(key, buffer[key].values, scheme)
			delete buffer[key]
		}

		// limpiar entradas viejas (timeout 5s)
		for (const k in buffer) {
			if (Date.now() / 1000 - buffer[k].created_at > 5) {
				procesarRegistro(k, buffer[k].values, scheme)
				delete buffer[k]
			}
		}

		saveBuffer(buffer)
		return res.status(200).json({ message: 'OK' })
	} catch (e) {
		return res.status(500).json({ message: 'Error procesando la alarma' })
	}
}

async function discord() {
	const webhookURL =
		'https://discord.com/api/webhooks/1395418860517200034/kqH7h5DDEm-xkvEoelJ0Pq3NdeUURXGAETrXb56XXU-78i3IYjiJ7R6DyJRuBUh3hpqD'
	try {
		await axios.post(webhookURL, {
			username: 'Reconecta_Morteros-BOT',
			avatar_url: 'https://reconecta.cooptech.com.ar/assets/img/Logo/Logo.png',
			content: 'Para más información accede a la página',
			embeds: [
				{
					title: ':warning: Alerta :warning:',
					color: 16711680,
					url: 'https://reconecta.cooptech.com.ar/',
					image: {
						url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoUy0Wg8ovbtNuEGUcOaj1qoYsKrHcm2pa4A&s',
					},
				},
			],
		})
		console.log('Mensaje enviado')
	} catch (error) {
		console.error('Error al enviar mensaje:', error)
	}
}

module.exports = {
	influxAlarm,
}
