const { default: axios } = require('axios')
const { getEquipment } = require('../services/ElementService')
const { checkIsAlarm } = require('../services/EventService')
const { saveAlarm, discordCredentials } = require('../services/AlarmService')
const { listClients } = require('../utils/js/clients')
const { getTenantDb } = require('../models')
const https = require('https')

let discordQueue = null

const initDiscordQueue = async () => {
	if (!discordQueue) {
		const { default: PQueue } = await import('p-queue')
		discordQueue = new PQueue({
			concurrency: 1,
			interval: 1000,
			intervalCap: 3,
		})
	}
}

const httpsAgent = new https.Agent({
	keepAlive: true,
	maxSockets: 20,
})

const axiosInstance = axios.create({
	httpsAgent,
	timeout: 5000,
})

const influxAlarm = async (req, res) => {
	try {
		const { topic, _value } = req.body
		const { scheme } = req.params
		const eventId = _value

		if (!topic || !eventId) return res.status(400).json({ error: 'Faltan campos obligatorios' })

		const { dbTenant, recloser } = await dataSchema(scheme, topic)

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
		await initDiscordQueue()
		await discordQueue.add(() => discord(dbTenant, title, content))

		return res.json({ message: 'OK' })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const influxAlarmDeadman = async (req, res) => {
	try {
		const { topic } = req.body
		const { scheme } = req.params
		if (!topic) return res.status(400).json({ error: 'Faltan campos obligatorios' })
		const { dbTenant } = await dataSchema(scheme, topic)
		const title = `Haciendo moco`
		const webhook = '1464248365465211004/X8QLDMKj0s-BcWyJNtdqYDfQu0btZvNDZRJoaA248CmZZCNHGKSmRmzW2bO2B_PxS3kl'
		await initDiscordQueue()
		await discordQueue.add(() => discord(dbTenant, title, topic, webhook))

		return res.json({ message: 'OK' })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

async function discord(db, title, content, webhook = false, retries = 3) {
	try {
		const credentials = await discordCredentials(db)
		const urlWebhook = webhook || credentials.webhook
		const webhookURL = `https://discord.com/api/webhooks/${urlWebhook}`

		await axiosInstance.post(webhookURL, {
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
		const retryable = ['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code)

		if (retryable && retries > 0) {
			await new Promise((r) => setTimeout(r, 1000))
			return discord(db, title, content, webhook, retries - 1)
		}

		throw error
	}
}

async function dataSchema(scheme, topic) {
	let dbTenant = null
	let recloser = []
	const serial = topic.split('/')[4]

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
	return { dbTenant, recloser }
}

module.exports = {
	influxAlarm,
	influxAlarmDeadman,
}
