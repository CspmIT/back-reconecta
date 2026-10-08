const { isConfigured, sendToSubscriptions } = require('./PushService')
const { recipientsFor, whatsappRecipientsFor } = require('./NotificationPrefService')
const WhatsApp = require('./WhatsAppService')

const saveAlarm = async (db, data) => {
	await db.Logs_Alarm.create(data)
}

const discordCredentials = async (db) => {
	const credentials = await db.Discord.findOne({ where: { id: 1 } })
	return credentials
}

/**
 * Manda la alarma como notificacion push a los dispositivos de los usuarios del
 * tenant que no la tengan silenciada (ver NotificationPrefService). Corre en
 * paralelo al webhook de Discord: si el push falla, la alerta ya salio por ahi.
 *
 * @param {Object} db - Instancia del tenant.
 * @param {Object} alarm - { title, body, type_alarm, type, id_device, id_event, priority, tag }.
 * @returns {Promise<{sent:number, failed:number, removed:number, recipients:number}>}
 */
const notifyAlarm = async (db, alarm) => {
	const empty = { sent: 0, failed: 0, removed: 0, recipients: 0 }

	// Sin claves VAPID el modulo queda inactivo y el resto sigue funcionando.
	if (!isConfigured()) return empty

	const subscriptions = await recipientsFor(db, alarm)
	if (!subscriptions.length) return empty

	const result = await sendToSubscriptions(db, subscriptions, alarm)
	return { ...result, recipients: subscriptions.length }
}

/**
 * Manda la alarma por WhatsApp (plantilla aprobada) a los usuarios con el numero
 * vinculado y el opt-in vigente, con los mismos filtros de preferencias que el push.
 *
 * @param {Object} db - Instancia del tenant.
 * @param {Object} alarm - { title, body, type_alarm, type, id_device, id_event, priority }.
 * @returns {Promise<{sent:number, failed:number, recipients:number}>}
 */
const notifyAlarmWhatsApp = async (db, alarm) => {
	const empty = { sent: 0, failed: 0, recipients: 0 }

	// Sin credenciales de Meta el canal queda inactivo y el resto sigue igual.
	if (!WhatsApp.isConfigured()) return empty

	const phones = await whatsappRecipientsFor(db, alarm)
	if (!phones.length) return empty

	const result = await WhatsApp.sendAlarm(phones, alarm)
	for (const r of result.results) {
		if (r.error) console.error(`WhatsApp a ${r.to}:`, r.error)
	}
	return { sent: result.sent, failed: result.failed, recipients: phones.length }
}

module.exports = {
	saveAlarm,
	discordCredentials,
	notifyAlarm,
	notifyAlarmWhatsApp,
}
