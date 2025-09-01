const { default: axios } = require('axios')
const { changeSchema } = require('../models')
const { getEquipment } = require('../services/ElementService')
const { checkIsAlarm } = require('../services/EventService')
const { saveAlarm } = require('../services/AlarmService')

const influxAlarm = async (req, res) => {
	try {
		const { topic, _value } = req.body
		const { scheme } = req.params
		const eventId = _value
		if (topic || !eventId) return res.status(400).json({ error: 'Faltan campos obligatorios' })

		const topicSplit = topic.split('/')
		const serial = topicSplit[4]
		await changeSchema(`reconecta_${scheme}`)
		const recloser = await getEquipment({ serial })
		if (!recloser[0]) return
		const isAlarm = await checkIsAlarm({ version: recloser[0].equipmentmodels.id, eventId })
		if (!isAlarm) return
		const body = {
			id_device: recloser[0].id,
			type: 'Reconectador',
			id_event: isAlarm.id,
		}
		await saveAlarm(body)
		await discord(isAlarm.name)

		return res.json({ message: 'OK' })
	} catch (e) {
		console.error(e)
		return res.status(500).json({ message: e.message })
	}
}

async function discord(content) {
	const webhookURL =
		'https://discord.com/api/webhooks/1395418860517200034/kqH7h5DDEm-xkvEoelJ0Pq3NdeUURXGAETrXb56XXU-78i3IYjiJ7R6DyJRuBUh3hpqD'
	try {
		await axios.post(webhookURL, {
			username: 'Reconecta_Morteros-BOT',
			avatar_url: 'https://reconecta.cooptech.com.ar/assets/img/Logo/Logo.png',
			content,
			embeds: [
				{
					title: `:warning: Alerta :warning:`,
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
