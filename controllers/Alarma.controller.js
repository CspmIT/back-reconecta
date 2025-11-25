const { default: axios } = require('axios')
const { changeSchema } = require('../models')
const { getEquipment } = require('../services/ElementService')
const { checkIsAlarm } = require('../services/EventService')
const { saveAlarm, discordCredentials } = require('../services/AlarmService')
const { listClients } = require('../utils/js/clients')

const influxAlarm = async (req, res) => {
	try {
		const { topic, _value } = req.body
		const { scheme } = req.params
		const eventId = _value
		if (!topic || !eventId) return res.status(400).json({ error: 'Faltan campos obligatorios' })

		const topicSplit = topic.split('/')
		const serial = topicSplit[4]
		let recloser = []
		if (scheme !== 'externo') {
			await changeSchema(`reconecta_${scheme}`)
			recloser = await getEquipment({ serial })
		} else {
			for (const client of listClients) {
				await changeSchema(`reconecta_${client}`)
				recloser = await getEquipment({ serial })
				if (recloser && recloser[0]) break
			}
		}
		if (!recloser || !recloser[0]) {
			return res.json({ message: 'Equipo no encontrado' })
		}
		const isAlarm = await checkIsAlarm({ version: recloser[0].equipmentmodels.id, eventId })
		if (!isAlarm) return res.json({ message: 'No es alarma' })
		const body = {
			id_device: recloser[0].id,
			type: 'Reconectador',
			id_event: isAlarm.id,
		}
		const title = `Alerta reconectador ${recloser[0].observation}`
		const content = isAlarm.name
		await saveAlarm(body)
		await discord(title, content)

		return res.json({ message: 'OK' })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

async function discord(title, content) {
	try {
		const credentials = await discordCredentials()
		const webhookURL = `https://discord.com/api/webhooks/${credentials.webhook}`
		await axios.post(webhookURL, {
			username: credentials.username,
			avatar_url: 'https://reconecta.cooptech.com.ar/assets/img/Logo/Logo.png',
			content: title,
			embeds: [
				{
					title: `:warning: ${content}`,
					color: 15007526,
					url: 'https://reconecta.cooptech.com.ar/',
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
