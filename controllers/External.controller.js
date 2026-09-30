const { listEquipments, findEquipment, serializeEquipment, instant, history, events, alarms } = require('../services/ExternalApiService')
const { buildSpec } = require('../utils/externalApiSpec')

/**
 * Respuesta de error de la API externa. Los errores con `status` son de
 * validacion y su mensaje es para el integrador; el resto se loguea y sale como
 * 500 generico, sin detalles de Influx ni de la base.
 */
const fail = (res, e, where) => {
	if (e.status) return res.status(e.status).json({ error: e.message })
	console.error(`API externa ${where}:`, e.message)
	return res.status(500).json({ error: 'Error interno al consultar los datos' })
}

const me = (req, res) => {
	const { apiToken, schema } = req.user
	return res.status(200).json({ name: apiToken.name, cooperative: schema, scopes: apiToken.scopes })
}

const openapi = (req, res) => {
	return res.status(200).json(buildSpec(`${req.baseUrl}`))
}

const getEquipments = async (req, res) => {
	try {
		return res.status(200).json(await listEquipments(req.db, { type: req.query.type }))
	} catch (e) {
		return fail(res, e, 'equipments')
	}
}

const getEquipment = async (req, res) => {
	try {
		return res.status(200).json(serializeEquipment(await findEquipment(req.db, req.params.serial)))
	} catch (e) {
		return fail(res, e, 'equipment')
	}
}

const getInstant = async (req, res) => {
	try {
		const equipment = await findEquipment(req.db, req.params.serial)
		return res.status(200).json(await instant(req.db, req.user.influx_name, equipment))
	} catch (e) {
		return fail(res, e, 'instant')
	}
}

const getHistory = async (req, res) => {
	try {
		const equipment = await findEquipment(req.db, req.params.serial)
		return res.status(200).json(await history(req.db, req.user.influx_name, equipment, req.query))
	} catch (e) {
		return fail(res, e, 'history')
	}
}

const getEvents = async (req, res) => {
	try {
		const equipment = await findEquipment(req.db, req.params.serial)
		return res.status(200).json(await events(req.db, req.user.influx_name, equipment, req.query))
	} catch (e) {
		return fail(res, e, 'events')
	}
}

const getAlarms = async (req, res) => {
	try {
		return res.status(200).json(await alarms(req.db, req.user.influx_name, req.query))
	} catch (e) {
		return fail(res, e, 'alarms')
	}
}

module.exports = { me, openapi, getEquipments, getEquipment, getInstant, getHistory, getEvents, getAlarms }
