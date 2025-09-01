const { default: axios } = require('axios')
const { changeSchema } = require('../models')
const { getEquipment } = require('../services/ElementService')
const { checkIsAlarm } = require('../services/EventService')
const { saveAlarm } = require('../services/AlarmService')
const { saveBuffer, loadBuffer } = require('../utils/js/buffer')

async function procesarRegistro(topic, values, scheme) {
	try {
		await discord(values, scheme)
		const topicSplit = topic.split('/')
		const serial = topicSplit[4]
		const eventId = values.find((v) => v.field === 'events_0').value
		const info = values.find((v) => v.field === 'info').value
		const eventDate = values.find((v) => v.field === 'events_1').value
		if (scheme === 'morteros') {
			await changeSchema('reconecta_morteros')
			const recloser = await getEquipment({ serial })
			if (!recloser[0] || !eventId) return
			const isAlarm = await checkIsAlarm({ version: recloser[0].equipmentmodels.id, eventId })
			if (!isAlarm) return
			const body = {
				id_device: recloser[0].id,
				type: 'Reconectador',
				id_event: isAlarm.id,
				info,
				eventDate: parseInt(eventDate),
			}
			await saveAlarm(body)
		}
	} catch (e) {
		throw e
	}
}

const influxAlarm = async (req, res) => {
	try {
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
			await procesarRegistro(key, buffer[key].values, scheme)
			delete buffer[key]
		}

		// limpiar entradas viejas (timeout 5s)
		for (const k in buffer) {
			if (Date.now() / 1000 - buffer[k].created_at > 5) {
				await procesarRegistro(k, buffer[k].values, scheme)
				delete buffer[k]
			}
		}

		saveBuffer(buffer)
		return res.status(200).json({ message: 'OK' })
	} catch (e) {
		return res.status(500).json({ message: 'Error procesando la alarma ' + e.message })
	}
}

async function discord(data, scheme) {
	const webhookURL =
		'https://discord.com/api/webhooks/1395418860517200034/kqH7h5DDEm-xkvEoelJ0Pq3NdeUURXGAETrXb56XXU-78i3IYjiJ7R6DyJRuBUh3hpqD'
	try {
		await axios.post(webhookURL, {
			username: 'Reconecta_Morteros-BOT',
			avatar_url: 'https://reconecta.cooptech.com.ar/assets/img/Logo/Logo.png',
			content: JSON.stringify(data),
			embeds: [
				{
					title: `:warning: Alerta ${scheme} :warning:`,
					color: 16711680,
					url: 'https://reconecta.cooptech.com.ar/',
					/* image: {
						url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoUy0Wg8ovbtNuEGUcOaj1qoYsKrHcm2pa4A&s',
					}, */
				},
			],
		})
	} catch (error) {
		console.error('Error al enviar mensaje:', error)
	}
}

module.exports = {
	influxAlarm,
}
