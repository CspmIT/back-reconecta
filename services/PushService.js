const webpush = require('web-push')

// Web Push estandar (VAPID): no hay SDK de terceros, el backend firma con su
// propio par de claves y el payload va cifrado hasta el navegador. Generar el
// par una sola vez con:  node -e "console.log(require('web-push').generateVAPIDKeys())"
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:soporte@coopmorteros.coop'
const APP_URL = process.env.APP_URL || 'https://reconecta.cooptech.com.ar/'

// Los push services borran suscripciones viejas: estos codigos significan que el
// endpoint ya no existe y la fila hay que eliminarla, no reintentarla.
const GONE_STATUS = [404, 410]

let vapidReady = false
let queue = null

const isConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

const getPublicKey = () => process.env.VAPID_PUBLIC_KEY || null

const configureVapid = () => {
	if (vapidReady) return
	if (!isConfigured()) throw new Error('Faltan las claves VAPID (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)')
	webpush.setVapidDetails(SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
	vapidReady = true
}

// p-queue es ESM: se importa en caliente igual que en el envio a Discord.
const initQueue = async () => {
	if (!queue) {
		const { default: PQueue } = await import('p-queue')
		queue = new PQueue({ concurrency: 5, interval: 1000, intervalCap: 20 })
	}
	return queue
}

// Filas completas (incluyen las claves de cifrado): solo para enviar.
const subscriptionsOf = async (db, idUser) => {
	return db.PushSubscription.findAll({ where: { id_user: idUser } })
}

// Version para mostrar en pantalla: sin las claves de cifrado.
const listSubscriptions = async (db, idUser) => {
	return db.PushSubscription.findAll({
		where: { id_user: idUser },
		attributes: ['id', 'endpoint', 'user_agent', 'last_success_at', 'last_error', 'createdAt'],
		order: [['createdAt', 'DESC']],
	})
}

/**
 * Guarda (o reasigna) la suscripcion del navegador. El endpoint es unico: si el
 * mismo dispositivo lo usa otro usuario, la fila pasa a ese usuario en lugar de
 * duplicarse, si no el push le seguiria llegando al usuario anterior.
 */
const saveSubscription = async (db, idUser, subscription, userAgent = null) => {
	const endpoint = subscription?.endpoint
	const p256dh = subscription?.keys?.p256dh
	const auth = subscription?.keys?.auth

	if (!endpoint || !p256dh || !auth) throw new Error('Suscripcion incompleta (endpoint y keys son obligatorios)')

	const data = {
		id_user: idUser,
		endpoint,
		p256dh,
		auth,
		user_agent: userAgent ? String(userAgent).slice(0, 255) : null,
		last_error: null,
	}

	const [row, created] = await db.PushSubscription.findOrCreate({ where: { endpoint }, defaults: data })
	if (!created) await row.update(data)
	return row
}

const removeSubscription = async (db, idUser, endpoint) => {
	if (!endpoint) throw new Error('Falta el endpoint')
	return db.PushSubscription.destroy({ where: { id_user: idUser, endpoint } })
}

// El Topic del push service colapsa notificaciones no entregadas del mismo
// asunto: solo admite base64 url-safe de hasta 32 caracteres.
const asTopic = (tag) => {
	if (!tag) return undefined
	const clean = String(tag).replace(/[^A-Za-z0-9\-_]/g, '-').slice(0, 32)
	return clean || undefined
}

const buildPayload = (notification) => {
	return JSON.stringify({
		title: notification.title,
		body: notification.body,
		url: notification.url || APP_URL,
		tag: notification.tag || null,
		priority: notification.priority ?? null,
		type_alarm: notification.type_alarm ?? null,
		id_device: notification.id_device ?? null,
		id_event: notification.id_event ?? null,
		sentAt: new Date().toISOString(),
	})
}

// Evita un UPDATE por alarma y por dispositivo: solo escribe si hay algo nuevo
// que registrar (venia con error o el ultimo exito ya tiene mas de una hora).
const HOUR = 60 * 60 * 1000
const trackSuccess = async (sub) => {
	const stale = !sub.last_success_at || Date.now() - new Date(sub.last_success_at).getTime() > HOUR
	if (!sub.last_error && !stale) return
	await sub.update({ last_success_at: new Date(), last_error: null })
}

const deliver = async (db, sub, payload, notification) => {
	try {
		await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
			TTL: notification.ttl ?? 3600,
			urgency: notification.priority === 1 ? 'high' : 'normal',
			topic: asTopic(notification.tag),
		})
		await trackSuccess(sub)
		return { status: 'sent' }
	} catch (error) {
		const code = error.statusCode
		if (GONE_STATUS.includes(code)) {
			await sub.destroy()
			return { status: 'removed' }
		}
		await sub.update({ last_error: `${code || error.code || 'ERR'}: ${error.message}`.slice(0, 255) })
		return { status: 'failed', error: error.message }
	}
}

/**
 * Envia una notificacion a un conjunto de suscripciones. No lanza: informa el
 * resultado por dispositivo para que el llamador decida si le importa.
 */
const sendToSubscriptions = async (db, subscriptions, notification) => {
	const result = { sent: 0, failed: 0, removed: 0 }
	if (!subscriptions?.length) return result

	configureVapid()
	const payload = buildPayload(notification)
	const q = await initQueue()

	const outcomes = await Promise.allSettled(
		subscriptions.map((sub) => q.add(() => deliver(db, sub, payload, notification)))
	)
	for (const outcome of outcomes) {
		// Un rechazo aca ya no es del push service sino de la base: cuenta como fallo.
		if (outcome.status === 'rejected') result.failed += 1
		else result[outcome.value.status] += 1
	}

	return result
}

module.exports = {
	isConfigured,
	getPublicKey,
	listSubscriptions,
	subscriptionsOf,
	saveSubscription,
	removeSubscription,
	sendToSubscriptions,
}
