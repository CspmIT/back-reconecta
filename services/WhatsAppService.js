const { default: axios } = require('axios')
const crypto = require('crypto')
const https = require('https')

// WhatsApp Cloud API (Meta). Un unico numero emisor para todas las cooperativas:
// las credenciales viven en el .env, no por tenant. El token es el de un System
// User del Business Portfolio (no el temporal de la consola, que vence en 24 h).
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0'
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'es_AR'

// Las alarmas las inicia el sistema, no el usuario: fuera de la ventana de 24 h
// solo se pueden mandar plantillas aprobadas (categoria UTILITY). Ambas esperan
// {{1}} equipo, {{2}} evento y {{3}} fecha.
const TEMPLATES = {
	event: process.env.WHATSAPP_TEMPLATE_ALARM || 'reconecta_alarma',
	deadman: process.env.WHATSAPP_TEMPLATE_DEADMAN || 'reconecta_sin_comunicacion',
}

// Errores de Graph que vale la pena reintentar en unos segundos: limite de
// throughput del numero (130429) y fallas transitorias del lado de Meta.
const RETRYABLE_CODES = [1, 2, 4, 130429, 131000, 131016]
const RETRYABLE_NET = ['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED']

let queue = null

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20 })

const graph = axios.create({
	baseURL: `https://graph.facebook.com/${API_VERSION}`,
	httpsAgent,
	timeout: 10000,
})

const isConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)

// p-queue es ESM: se importa en caliente igual que en Push y Discord. Meta admite
// ~80 msg/s por numero; nos quedamos muy por debajo.
const initQueue = async () => {
	if (!queue) {
		const { default: PQueue } = await import('p-queue')
		queue = new PQueue({ concurrency: 3, interval: 1000, intervalCap: 10 })
	}
	return queue
}

/**
 * Normaliza un telefono a lo que espera la API: solo digitos, con codigo de pais
 * y sin '+'. Para Argentina agrega el 9 de movil (54 9 ...). No intenta sacar el
 * 15: el numero tiene que cargarse como codigo de area + numero, sin 0 ni 15.
 *
 * @param {string} raw - Ej: '+54 9 3562 123456', '03562 123456', '3562123456'.
 * @returns {string|null} Ej: '5493562123456', o null si no es valido.
 */
const normalizePhone = (raw) => {
	if (!raw) return null
	let digits = String(raw).replace(/\D/g, '')

	if (digits.startsWith('00')) digits = digits.slice(2)
	// Formato local con 0 adelante: 03562 123456
	else if (digits.startsWith('0')) digits = `54${digits.slice(1)}`
	// Area + numero sin prefijos (10 digitos): 3562 123456
	else if (digits.length === 10) digits = `54${digits}`

	if (digits.startsWith('540')) digits = `54${digits.slice(3)}`
	if (digits.startsWith('54') && digits[2] !== '9') digits = `549${digits.slice(2)}`

	if (digits.length < 8 || digits.length > 15) return null
	return digits
}

// Los parametros de plantilla no admiten saltos de linea, tabs ni mas de 4
// espacios seguidos: Meta rechaza el mensaje entero (error 132018).
const cleanParam = (value) => {
	const text = String(value ?? '-')
		.replace(/[\r\n\t]+/g, ' ')
		.replace(/ {2,}/g, ' ')
		.trim()
	return text.slice(0, 1000) || '-'
}

const formatDate = (date = new Date()) => {
	return new Date(date).toLocaleString('es-AR', {
		timeZone: 'America/Argentina/Cordoba',
		dateStyle: 'short',
		timeStyle: 'short',
	})
}

// Normaliza el error de axios/Graph a { code, message, retryable }.
const describeError = (error) => {
	const graphError = error.response?.data?.error
	if (graphError) {
		const details = graphError.error_data?.details
		return {
			code: graphError.code,
			message: details ? `${graphError.message} (${details})` : graphError.message,
			retryable: RETRYABLE_CODES.includes(graphError.code) || error.response.status >= 500,
		}
	}
	return {
		code: error.code || 'ERR',
		message: error.message,
		retryable: RETRYABLE_NET.includes(error.code),
	}
}

const post = async (payload, retries = 3) => {
	if (!isConfigured()) throw new Error('Faltan WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID')
	try {
		const { data } = await graph.post(`/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, payload, {
			headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
		})
		// El wamid es la clave para cruzar despues los estados que llegan por webhook.
		return { wamid: data.messages?.[0]?.id || null, waId: data.contacts?.[0]?.wa_id || null }
	} catch (error) {
		const info = describeError(error)
		if (info.retryable && retries > 0) {
			await new Promise((r) => setTimeout(r, (4 - retries) * 1000))
			return post(payload, retries - 1)
		}
		const err = new Error(`WhatsApp ${info.code}: ${info.message}`)
		err.code = info.code
		throw err
	}
}

/**
 * Manda una plantilla aprobada. Lanza si Meta la rechaza.
 *
 * @param {string} to - Telefono (se normaliza).
 * @param {string} name - Nombre de la plantilla en WhatsApp Manager.
 * @param {Array<string>} params - Valores de {{1}}, {{2}}, ... del cuerpo.
 * @param {Object} [options] - { lang }
 * @returns {Promise<{wamid:string, waId:string}>}
 */
const sendTemplate = async (to, name, params = [], { lang = TEMPLATE_LANG } = {}) => {
	const phone = normalizePhone(to)
	if (!phone) throw new Error(`Telefono invalido: ${to}`)

	const template = { name, language: { code: lang } }
	if (params.length) {
		template.components = [
			{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: cleanParam(p) })) },
		]
	}

	return post({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'template', template })
}

/**
 * Texto libre: solo funciona dentro de las 24 h desde el ultimo mensaje del
 * usuario (p. ej. para responderle algo que escribio). Para alarmas usar
 * sendTemplate / sendAlarm.
 */
const sendText = async (to, text) => {
	const phone = normalizePhone(to)
	if (!phone) throw new Error(`Telefono invalido: ${to}`)
	return post({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { preview_url: false, body: text } })
}

/**
 * Envia una alarma a varios telefonos. No lanza: informa el resultado por
 * destinatario para que el llamador decida que guardar.
 *
 * @param {Array<string>} phones - Telefonos de los destinatarios.
 * @param {Object} alarm - { title, body, type_alarm, date? }. type_alarm 'Deadman'
 *                         usa la plantilla de sin comunicacion.
 * @returns {Promise<{sent:number, failed:number, results:Array<{to, wamid?, error?}>}>}
 */
const sendAlarm = async (phones, alarm) => {
	const result = { sent: 0, failed: 0, results: [] }
	// Sin credenciales el canal queda inactivo y el resto sigue funcionando.
	if (!isConfigured()) return result

	const unique = [...new Set((phones || []).map(normalizePhone).filter(Boolean))]
	if (!unique.length) return result

	const template = alarm.type_alarm === 'Deadman' ? TEMPLATES.deadman : TEMPLATES.event
	const params = [alarm.title, alarm.body, formatDate(alarm.date)]
	const q = await initQueue()

	const outcomes = await Promise.allSettled(unique.map((to) => q.add(() => sendTemplate(to, template, params))))
	outcomes.forEach((outcome, i) => {
		const to = unique[i]
		if (outcome.status === 'fulfilled') {
			result.sent += 1
			result.results.push({ to, wamid: outcome.value.wamid })
		} else {
			result.failed += 1
			result.results.push({ to, error: outcome.reason.message })
		}
	})

	return result
}

/**
 * Handshake del webhook (GET): Meta manda hub.mode, hub.verify_token y
 * hub.challenge; si el token coincide hay que devolver el challenge tal cual.
 *
 * @returns {string|null} El challenge a responder, o null si no corresponde.
 */
const verifyWebhook = (query = {}) => {
	const expected = process.env.WHATSAPP_VERIFY_TOKEN
	if (!expected) return null
	if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === expected) return query['hub.challenge']
	return null
}

/**
 * Valida la firma X-Hub-Signature-256 de un POST del webhook. Necesita el body
 * crudo (Buffer/string), no el JSON ya parseado: cualquier diferencia de
 * espacios rompe el HMAC.
 */
const validSignature = (rawBody, header) => {
	const secret = process.env.WHATSAPP_APP_SECRET
	if (!secret || !rawBody || !header?.startsWith('sha256=')) return false
	const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
	const received = header.slice('sha256='.length)
	if (received.length !== expected.length) return false
	return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'))
}

/**
 * Extrae del payload del webhook los cambios de estado de los mensajes
 * enviados (sent / delivered / read / failed) y los mensajes entrantes.
 *
 * @returns {{statuses:Array, messages:Array}}
 */
const parseWebhook = (body) => {
	const statuses = []
	const messages = []
	for (const entry of body?.entry || []) {
		for (const change of entry.changes || []) {
			const value = change.value || {}
			for (const s of value.statuses || []) {
				statuses.push({
					wamid: s.id,
					status: s.status,
					to: s.recipient_id,
					at: new Date(Number(s.timestamp) * 1000),
					error: s.errors?.[0] ? `${s.errors[0].code}: ${s.errors[0].title}` : null,
				})
			}
			for (const m of value.messages || []) {
				messages.push({
					wamid: m.id,
					from: m.from,
					type: m.type,
					text: m.text?.body || m.button?.text || null,
					at: new Date(Number(m.timestamp) * 1000),
				})
			}
		}
	}
	return { statuses, messages }
}

module.exports = {
	isConfigured,
	normalizePhone,
	sendTemplate,
	sendText,
	sendAlarm,
	verifyWebhook,
	validSignature,
	parseWebhook,
}
