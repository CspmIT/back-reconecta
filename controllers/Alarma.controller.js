const { default: axios } = require('axios')
const { changeSchema } = require('../models')
const { getEquipment } = require('../services/ElementService')
const { checkIsAlarm } = require('../services/EventService')
const { saveAlarm } = require('../services/AlarmService')
const { getCompleteRecords, cleanupOld, addToBuffer } = require('../utils/js/buffer')

async function procesarRegistro(topic, values, scheme) {
	try {
		await discord(values, scheme)
		const topicSplit = topic.split('/')
		const serial = topicSplit[4]
		const eventId = values.find((v) => v.field === 'events_0')?.value
		const info = values.find((v) => v.field === 'info')?.value
		const eventDate = values.find((v) => v.field === 'events_1')?.value
		await changeSchema(`reconecta_${scheme}`)
		const recloser = await getEquipment({ serial })
		if (!recloser[0] || !eventId) return
		const isAlarm = await checkIsAlarm({ version: recloser[0].equipmentmodels.id, eventId })
		if (!isAlarm) return
		const body = {
			id_device: recloser[0].id,
			type: 'Reconectador',
			id_event: isAlarm.id,
			info: info || null,
			eventDate: parseInt(eventDate || 0),
		}
		await saveAlarm(body)
	} catch (e) {
		throw e
	}
}

const influxAlarm = async (req, res) => {
	try {
		const post = req.body
		const { scheme } = req.params
		const field = post._field
		if (!post.topic || !post._time || !field) return res.status(400).json({ error: 'Faltan campos obligatorios' })

		const key = `${post.topic}-${post._time}`
		addToBuffer(key, field, post._value ?? null)

		// procesar registros completos
		const complete = getCompleteRecords()
		for (const rec of complete) await procesarRegistro(rec.key, rec.values, scheme)

		// limpiar registros viejos
		const old = cleanupOld(5)
		for (const rec of old) await procesarRegistro(rec.key, rec.values, scheme)

		return res.json({ message: 'OK' })
	} catch (e) {
		console.error(e)
		return res.status(500).json({ message: e.message })
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
