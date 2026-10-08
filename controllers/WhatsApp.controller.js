const WhatsApp = require('../services/WhatsAppService')
const { linkStatus, startLink, unlink, setEnabled, handleIncoming } = require('../services/WhatsAppLinkService')

// Meta reintenta el webhook si no recibe 200 a tiempo: se recuerdan los ultimos
// wamid procesados para no vincular ni contestar dos veces el mismo mensaje.
const SEEN_MAX = 1000
const seen = new Set()
const firstTime = (wamid) => {
	if (!wamid || seen.has(wamid)) return false
	seen.add(wamid)
	if (seen.size > SEEN_MAX) seen.delete(seen.values().next().value)
	return true
}

const status = async (req, res) => {
	try {
		const data = await linkStatus(req.db, req.user.id)
		return res.status(200).json({ ...data, configured: WhatsApp.isConfigured() })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

/**
 * Genera el codigo de vinculacion. El front muestra el link (o un QR del link)
 * y consulta /whatsapp/status hasta que linked pase a true.
 */
const link = async (req, res) => {
	try {
		if (!WhatsApp.isConfigured()) throw new Error('WhatsApp no esta configurado en el servidor')
		const data = await startLink(req.db, req.user.id, req.user.schema)
		return res.status(200).json(data)
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

const removeLink = async (req, res) => {
	try {
		const data = await unlink(req.db, req.user.id)
		return res.status(200).json(data)
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

/** Body: { enabled: boolean }. Pausa o reanuda sin desvincular. */
const updateEnabled = async (req, res) => {
	try {
		const data = await setEnabled(req.db, req.user.id, req.body?.enabled)
		return res.status(200).json(data)
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

/**
 * Alarma de prueba al telefono vinculado. Usa la plantilla real, asi que valida
 * todo el circuito (y Meta la cobra como cualquier otra).
 */
const sendTest = async (req, res) => {
	try {
		const pref = await req.db.NotificationPref.findOne({ where: { id_user: req.user.id } })
		if (!pref?.whatsapp_phone) throw new Error('No hay un telefono de WhatsApp vinculado')

		const result = await WhatsApp.sendAlarm([pref.whatsapp_phone], {
			title: 'Reconecta',
			body: 'Alarma de prueba: las alertas van a llegar por aca',
			type_alarm: 'Evento',
		})
		if (result.failed) throw new Error(result.results[0]?.error || 'No se pudo enviar')
		return res.status(200).json(result)
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

/** Handshake inicial que hace Meta al configurar la URL del webhook. */
const webhookVerify = (req, res) => {
	const challenge = WhatsApp.verifyWebhook(req.query)
	if (challenge == null) return res.sendStatus(403)
	return res.status(200).send(challenge)
}

/**
 * Eventos de Meta: mensajes entrantes y estados de los enviados. Se contesta
 * 200 enseguida y se procesa despues; Meta corta y reintenta si demora.
 */
const webhookReceive = (req, res) => {
	if (!WhatsApp.validSignature(req.rawBody, req.headers['x-hub-signature-256'])) return res.sendStatus(401)
	res.sendStatus(200)

	const { statuses, messages } = WhatsApp.parseWebhook(req.body)

	for (const s of statuses) {
		if (s.status === 'failed') console.error(`WhatsApp ${s.wamid} a ${s.to} fallo: ${s.error}`)
	}

	for (const message of messages) {
		if (!firstTime(message.wamid)) continue
		handleIncoming(message)
			// Respuesta dentro de la ventana de 24 h que abrio el propio mensaje.
			.then((reply) => reply && WhatsApp.sendText(message.from, reply))
			.catch((e) => console.error('WhatsApp entrante:', e.message))
	}
}

module.exports = {
	status,
	link,
	removeLink,
	updateEnabled,
	sendTest,
	webhookVerify,
	webhookReceive,
}
