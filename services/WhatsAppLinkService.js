const crypto = require('crypto')
const { getTenantDb } = require('../models')
const { listClients } = require('../utils/js/clients')
const { savePref } = require('./NotificationPrefService')

// Vinculacion del telefono de cada usuario con el numero unico de Reconecta.
//
// El usuario no tipea su numero: pide un codigo en la app y lo manda por
// WhatsApp al numero de Reconecta (link wa.me con el texto ya cargado). El
// webhook recibe el mensaje con el wa_id real del remitente, valida el codigo y
// deja el telefono vinculado. Eso prueba que el numero es suyo, deja constancia
// del opt-in que exige Meta y abre la ventana de 24 h para responderle gratis.
//
// El codigo lleva adelante la cooperativa (caroya-123456) porque el numero es
// uno solo para todos los tenants y el webhook no sabe de antemano de cual viene.

const CODE_TTL_MS = 15 * 60 * 1000
const SCHEMA_PREFIX = 'reconecta_'
const CODE_RE = /\b([a-z0-9_]+)-(\d{6})\b/i
const OPT_OUT_RE = /^\s*(baja|stop|cancelar)\s*$/i
const OPT_IN_RE = /^\s*alta\s*$/i

const tenantKeyOf = (schema) => String(schema || '').replace(SCHEMA_PREFIX, '')

// Solo tenants conocidos: el codigo llega de afuera y getTenantDb abre un pool
// nuevo por cada nombre distinto que reciba.
const isKnownTenant = (key) => listClients.includes(key)

const displayPhone = () => (process.env.WHATSAPP_DISPLAY_PHONE || '').replace(/\D/g, '')

const mask = (phone) => (phone ? `${'*'.repeat(Math.max(phone.length - 4, 0))}${phone.slice(-4)}` : null)

/** Estado del canal para la pantalla de configuracion del usuario. */
const linkStatus = async (db, idUser) => {
	const pref = await db.NotificationPref.findOne({ where: { id_user: idUser } })
	return {
		phone: mask(pref?.whatsapp_phone),
		linked: Boolean(pref?.whatsapp_phone),
		enabled: Boolean(pref?.whatsapp_phone && pref?.whatsapp_enabled),
		opt_in_at: pref?.whatsapp_opt_in_at || null,
		pending: Boolean(pref?.whatsapp_code && new Date(pref.whatsapp_code_expires_at) > new Date()),
	}
}

/**
 * Genera un codigo de vinculacion nuevo (invalida el anterior) y arma el link
 * wa.me con el mensaje listo para mandar.
 *
 * @param {string} schema - Schema del tenant (req.user.schema).
 * @returns {Promise<{code:string, text:string, link:string|null, expires_at:Date}>}
 */
const startLink = async (db, idUser, schema) => {
	const key = tenantKeyOf(schema)
	if (!isKnownTenant(key)) throw new Error(`La cooperativa ${key} no tiene habilitado WhatsApp`)

	const code = `${key}-${crypto.randomInt(0, 1000000).toString().padStart(6, '0')}`
	const expires = new Date(Date.now() + CODE_TTL_MS)

	// Asegura la fila con los valores por defecto antes de guardar el codigo.
	await savePref(db, idUser, {})
	await db.NotificationPref.update(
		{ whatsapp_code: code.split('-').pop(), whatsapp_code_expires_at: expires },
		{ where: { id_user: idUser } }
	)

	const text = `Quiero recibir las alertas de Reconecta. Codigo: ${code}`
	const phone = displayPhone()
	return {
		code,
		text,
		link: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : null,
		expires_at: expires,
	}
}

const unlink = async (db, idUser) => {
	await db.NotificationPref.update(
		{
			whatsapp_phone: null,
			whatsapp_enabled: false,
			whatsapp_code: null,
			whatsapp_code_expires_at: null,
		},
		{ where: { id_user: idUser } }
	)
	return linkStatus(db, idUser)
}

/** Pausa o reanuda el envio sin desvincular el numero. */
const setEnabled = async (db, idUser, enabled) => {
	const pref = await db.NotificationPref.findOne({ where: { id_user: idUser } })
	if (!pref?.whatsapp_phone) throw new Error('No hay un telefono de WhatsApp vinculado')
	await pref.update({ whatsapp_enabled: Boolean(enabled) })
	return linkStatus(db, idUser)
}

/**
 * Filas de NotificationPrefs vinculadas a un telefono, en todos los tenants.
 * Un mismo tecnico puede estar en mas de una cooperativa.
 *
 * @returns {Promise<Array<{schema:string, db:Object, pref:Object}>>}
 */
const linksByPhone = async (phone) => {
	const found = []
	for (const client of listClients) {
		const schema = `${SCHEMA_PREFIX}${client}`
		const db = await getTenantDb(schema)
		const prefs = await db.NotificationPref.findAll({ where: { whatsapp_phone: phone } })
		for (const pref of prefs) found.push({ schema, db, pref })
	}
	return found
}

const confirmLink = async (key, code, phone) => {
	if (!isKnownTenant(key)) return 'No reconozco ese codigo. Genera uno nuevo desde Reconecta.'

	const db = await getTenantDb(`${SCHEMA_PREFIX}${key}`)
	const pref = await db.NotificationPref.findOne({ where: { whatsapp_code: code } })
	if (!pref) return 'No reconozco ese codigo. Genera uno nuevo desde Reconecta.'

	if (new Date(pref.whatsapp_code_expires_at) < new Date()) {
		await pref.update({ whatsapp_code: null, whatsapp_code_expires_at: null })
		return 'El codigo vencio. Genera uno nuevo desde Reconecta.'
	}

	await pref.update({
		whatsapp_phone: phone,
		whatsapp_enabled: true,
		whatsapp_opt_in_at: new Date(),
		whatsapp_code: null,
		whatsapp_code_expires_at: null,
	})
	return (
		'Listo, este numero quedo vinculado a Reconecta y vas a recibir las alarmas por aca. ' +
		'Para dejar de recibirlas escribi BAJA, y para volver a activarlas, ALTA.'
	)
}

const setEnabledByPhone = async (phone, enabled) => {
	const links = await linksByPhone(phone)
	for (const { pref } of links) await pref.update({ whatsapp_enabled: enabled })
	return links.length
}

/**
 * Procesa un mensaje entrante y devuelve el texto a responder (o null). Por
 * ahora entiende el codigo de vinculacion, BAJA y ALTA; el resto queda como
 * punto de entrada para el bot de consultas.
 *
 * @param {{from:string, text:string|null}} message - Ver WhatsAppService.parseWebhook.
 * @returns {Promise<string|null>}
 */
const handleIncoming = async ({ from, text }) => {
	if (!from || !text) return null

	const match = text.match(CODE_RE)
	if (match) return confirmLink(match[1].toLowerCase(), match[2], from)

	if (OPT_OUT_RE.test(text)) {
		const count = await setEnabledByPhone(from, false)
		return count
			? 'Listo, no vas a recibir mas alarmas por WhatsApp. Escribi ALTA para volver a activarlas.'
			: 'Este numero no esta vinculado a Reconecta.'
	}

	if (OPT_IN_RE.test(text)) {
		const count = await setEnabledByPhone(from, true)
		return count
			? 'Listo, vas a volver a recibir las alarmas por aca.'
			: 'Este numero no esta vinculado. Vinculalo desde Reconecta > Notificaciones.'
	}

	const links = await linksByPhone(from)
	if (!links.length) return 'Este es el numero de alertas de Reconecta. Para vincularte, entra a Reconecta > Notificaciones.'
	return 'Este numero solo envia alertas de Reconecta. Escribi BAJA para dejar de recibirlas.'
}

module.exports = {
	linkStatus,
	startLink,
	unlink,
	setEnabled,
	linksByPhone,
	handleIncoming,
}
