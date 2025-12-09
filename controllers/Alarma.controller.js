const { default: axios } = require('axios')
const { getEquipment } = require('../services/ElementService')
const { checkIsAlarm } = require('../services/EventService')
const { saveAlarm, discordCredentials } = require('../services/AlarmService')
const { listClients } = require('../utils/js/clients')
const { getTenantDb } = require('../models')

const influxAlarm = async (req, res) => {
	try {
		const { topic, _value } = req.body
		const { scheme } = req.params
		const eventId = _value

		if (!topic || !eventId) return res.status(400).json({ error: 'Faltan campos obligatorios' })

		const serial = topic.split('/')[4]

		let dbTenant = null
		let recloser = []

		// Caso 1 — buscar SOLO en un tenant
		if (scheme !== 'externo') {
			const schemaName = `reconecta_${scheme}`
			dbTenant = await getTenantDb(schemaName)

			recloser = await getEquipment(dbTenant, { serial })
		}

		// Caso 2 — buscar en TODOS los tenants
		else {
			for (const client of listClients) {
				const schemaName = `reconecta_${client}`
				const dbLoop = await getTenantDb(schemaName)

				recloser = await getEquipment(dbLoop, { serial })

				if (recloser && recloser.length > 0) {
					dbTenant = dbLoop
					break
				}
			}
		}

		if (!recloser || recloser.length === 0) return res.json({ message: 'Equipo no encontrado' })

		const alarmDef = await checkIsAlarm(dbTenant, { version: recloser[0].equipmentmodels.id, eventId })

		if (!alarmDef) return res.json({ message: 'No es alarma' })

		const body = {
			id_device: recloser[0].id,
			type: 'Reconectador',
			id_event: alarmDef.id,
		}

		await saveAlarm(dbTenant, body)

		const title = `Alerta reconectador ${recloser[0].observation}`
		const content = alarmDef.name
		await discord(dbTenant, title, content)

		return res.json({ message: 'OK' })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

async function discord(db, title, content) {
	try {
		const credentials = await discordCredentials(db)
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
