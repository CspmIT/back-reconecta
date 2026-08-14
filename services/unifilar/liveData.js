// Datos en vivo para el visor unifilar: dado el mapeo entidad→equipo de un
// plano, arma un snapshot normalizado por entidad reutilizando las fuentes
// existentes (Reclosers en MySQL+Influx, Medidores en Influx, Nodos en MySQL).
//
// Respuesta por entidad:
//   { deviceType, deviceId, state, values: [{ key, value, unit }], error }
//   state: 'closed' | 'open' | 'fault' | 'offline' | null

const { getRecloserId, getMetrologiaIntantanea } = require('../RecloserServices')
const { getEnabled } = require('../MeterService')

const RECLOSER_STATES = { 0: 'closed', 1: 'open', 2: 'fault', 3: 'offline' }

const TIMEOUT_MS = 10000
const withTimeout = (promise) =>
	Promise.race([
		promise,
		new Promise((resolve, reject) => setTimeout(() => reject(new Error('Timeout consultando datos')), TIMEOUT_MS)),
	])

const round = (v) => (typeof v === 'number' ? Number(v.toFixed(1)) : v)

// La metrología de Influx llega como { campo: [{ field, value, ... }] }
const field = (metrology, name) => {
	const entry = metrology?.[name]?.[0]
	if (!entry) return null
	return round(entry.value ?? entry._value ?? null)
}

const recloserLive = async (db, deviceId, influxName) => {
	const recloser = await getRecloserId(db, deviceId)
	const state = RECLOSER_STATES[recloser.status_recloser] ?? null
	let values = []
	try {
		const metrology = await withTimeout(
			getMetrologiaIntantanea({ serial: recloser.serial, brand: recloser.version.brand.name }, influxName)
		)
		values = [
			{ key: 'I fase A', value: field(metrology, 'I_f_0'), unit: 'A' },
			{ key: 'I fase B', value: field(metrology, 'I_f_1'), unit: 'A' },
			{ key: 'I fase C', value: field(metrology, 'I_f_2'), unit: 'A' },
			{ key: 'V línea AB', value: field(metrology, 'V_L_ABC_0'), unit: 'V' },
			{ key: 'V línea BC', value: field(metrology, 'V_L_ABC_1'), unit: 'V' },
			{ key: 'V línea CA', value: field(metrology, 'V_L_ABC_2'), unit: 'V' },
			{ key: 'Frecuencia', value: field(metrology, 'F_ABC'), unit: 'Hz' },
		].filter((v) => v.value !== null && v.value !== undefined)
	} catch {
		// Estado disponible aunque la metrología no responda
	}
	return { state, alarm: Boolean(recloser.status_alarm), values }
}

const meterLive = async (db, deviceId, influxName) => {
	const { getMetrologyBasic } = require('../MeterService')
	const meters = await getEnabled(db)
	const meter = meters.find((m) => m.id == deviceId)
	if (!meter) throw new Error('Medidor no encontrado')
	const metrology = await withTimeout(
		getMetrologyBasic(
			{ serial: meter.serial, brand: meter.version.brand.name, version: meter.version.name },
			influxName
		)
	)
	const values = Object.entries(metrology?.VI || {})
		.slice(0, 8)
		.map(([key, entries]) => ({
			key,
			value: round(entries?.[0]?.value ?? entries?.[0]?._value ?? entries),
			unit: '',
		}))
		.filter((v) => v.value !== null && v.value !== undefined && typeof v.value !== 'object')
	return { state: null, values }
}

const nodeLive = async (db, deviceId) => {
	const node = await db.Node.findByPk(deviceId)
	if (!node) throw new Error('Nodo no encontrado')
	return {
		state: node.status ? null : 'offline',
		values: [{ key: 'Tipo', value: node.type, unit: '' }],
	}
}

const SOURCES = { recloser: recloserLive, meter: meterLive, node: nodeLive }

const getLiveData = async (db, mapping, influxName) => {
	const entries = Object.entries(mapping || {}).filter(([, m]) => m.deviceType && m.deviceId)
	const results = await Promise.all(
		entries.map(async ([entityId, m]) => {
			const base = { deviceType: m.deviceType, deviceId: m.deviceId }
			try {
				const source = SOURCES[m.deviceType]
				if (!source) throw new Error(`Fuente desconocida: ${m.deviceType}`)
				const live = await source(db, m.deviceId, influxName)
				return [entityId, { ...base, ...live, error: null }]
			} catch (e) {
				return [entityId, { ...base, state: null, values: [], error: e.message }]
			}
		})
	)
	return Object.fromEntries(results)
}

module.exports = { getLiveData }
