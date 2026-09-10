const {
	isConfigured,
	getPublicKey,
	saveSubscription,
	removeSubscription,
	listSubscriptions,
	subscriptionsOf,
	sendToSubscriptions,
} = require('../services/PushService')
const { getPref, savePref, ALARM_TYPES, DEVICE_TYPES, DEFAULTS } = require('../services/NotificationPrefService')

/**
 * Clave publica VAPID que el front necesita para suscribir al service worker.
 * Si no esta configurada el front deberia ocultar el modulo de notificaciones.
 */
const publicKey = async (req, res) => {
	try {
		return res.status(200).json({ publicKey: getPublicKey(), enabled: isConfigured() })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const subscribe = async (req, res) => {
	try {
		// Acepta directamente el JSON de PushSubscription.toJSON() del navegador.
		const subscription = req.body?.subscription || req.body
		const row = await saveSubscription(req.db, req.user.id, subscription, req.headers['user-agent'])
		return res.status(200).json({ id: row.id, endpoint: row.endpoint })
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

const unsubscribe = async (req, res) => {
	try {
		const endpoint = req.body?.endpoint || req.body?.subscription?.endpoint
		const removed = await removeSubscription(req.db, req.user.id, endpoint)
		return res.status(200).json({ removed })
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

const devices = async (req, res) => {
	try {
		const subscriptions = await listSubscriptions(req.db, req.user.id)
		return res.status(200).json(subscriptions)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

/**
 * Notificacion de prueba. A proposito ignora las preferencias: sirve para que el
 * usuario verifique el permiso del navegador, incluso en horario silenciado.
 */
const sendTest = async (req, res) => {
	try {
		if (!isConfigured()) throw new Error('Las notificaciones push no estan configuradas en el servidor')

		const subscriptions = await subscriptionsOf(req.db, req.user.id)
		if (!subscriptions.length) throw new Error('No hay dispositivos suscritos para este usuario')

		const result = await sendToSubscriptions(req.db, subscriptions, {
			title: 'Reconecta',
			body: 'Notificacion de prueba: las alertas van a llegar por aca.',
			tag: 'prueba',
			priority: 2,
		})
		return res.status(200).json(result)
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

const getPreferences = async (req, res) => {
	try {
		const pref = await getPref(req.db, req.user.id)
		return res.status(200).json(pref)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const updatePreferences = async (req, res) => {
	try {
		// Merge: solo se tocan los campos que vienen en el body.
		const pref = await savePref(req.db, req.user.id, req.body ?? {})
		return res.status(200).json(pref)
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

/**
 * Valores validos para armar la pantalla de configuracion. Los eventos y equipos
 * concretos se listan con los endpoints que ya existen (/AllEvents, /eventsDevices).
 */
const preferenceOptions = async (req, res) => {
	try {
		return res.status(200).json({
			alarm_types: ALARM_TYPES,
			device_types: DEVICE_TYPES,
			defaults: DEFAULTS,
		})
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	publicKey,
	subscribe,
	unsubscribe,
	devices,
	sendTest,
	getPreferences,
	updatePreferences,
	preferenceOptions,
}
