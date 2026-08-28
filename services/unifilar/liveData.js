// Datos en vivo para el visor unifilar: dados los elementos de la red de un
// plano, arma un snapshot normalizado por elemento.
//
// El vínculo se guarda contra un EQUIPO (`Equipment`), que es la entidad
// canónica del sistema: tiene el número de serie y, por su modelo, la marca y
// el tipo. Antes se guardaba contra tres listas separadas —reconectadores,
// medidores y nodos— cada una con su endpoint propio; esos endpoints quedaron
// obsoletos y además obligaban a decidir de antemano "de qué tipo" era el
// vínculo. Con Equipment el tipo se deduce del modelo y hay una sola lista.
//
// Respuesta por elemento:
//   { equipmentId, tipo, serial, state, alarm, values: [{ key, value, unit }], error }
//   state: 'closed' | 'open' | 'fault' | 'offline' | null

const { getEquipment } = require('../ElementService')
const { getStatusRecloser, getMetrologiaIntantanea } = require('../RecloserServices')
const { getStatus, getMetrologyBasic } = require('../MeterService')
const { getDataAnalyzer } = require('../AnalyzerService')
const { EventsCustom, getEventsInflux } = require('../EventService')

// Tipos de EquipmentModel (mismos valores que usa la tabla de inicio)
const TIPO = { RECLOSER: 1, MEDIDOR: 2, ANALIZADOR: 3 }

// getStatusRecloser devuelve 0 cerrado · 1 abierto · 2 cerrado sin tensión ·
// 3 sin señal. "Cerrado sin tensión" entra como falla porque es la condición
// anómala que el operador tiene que ver resaltada.
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

// Los servicios de Influx piden { serial, brand, version }, donde `brand` es el
// NOMBRE del modelo y `version` su MARCA. Está cruzado respecto de lo que
// sugieren los nombres, pero es con lo que se arman los topics MQTT en toda la
// app: ver cómo lo hace listElements en Element.controller.
const datosDe = (equipo) => ({
	serial: equipo.serial,
	brand: equipo.equipmentmodels?.name,
	version: equipo.equipmentmodels?.brand,
})

const recloserLive = async (equipo, influxName) => {
	const data = datosDe(equipo)
	const state = RECLOSER_STATES[await withTimeout(getStatusRecloser(data, influxName))] ?? null
	let values = []
	try {
		const metrology = await withTimeout(getMetrologiaIntantanea(data, influxName))
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
		// El estado sirve aunque la metrología no responda: son dos consultas
		// distintas y que falle la segunda no invalida la primera.
	}
	return { state, values }
}

const meterLive = async (equipo, influxName) => {
	const data = datosDe(equipo)
	// getStatus devuelve 1 con datos recientes y 2 sin ellos.
	const conectado = (await withTimeout(getStatus(data, influxName))) === 1
	if (!conectado) return { state: 'offline', values: [] }
	const metrology = await withTimeout(getMetrologyBasic(data, influxName))
	const values = Object.entries(metrology?.VI || {})
		.slice(0, 8)
		.map(([key, entries]) => ({
			key,
			value: round(entries?.[0]?.value ?? entries?.[0]?._value ?? entries),
			unit: '',
		}))
		.filter((v) => v.value !== null && v.value !== undefined && typeof v.value !== 'object')
	// Un medidor no abre ni cierra: no tiene estado de maniobra que informar.
	return { state: null, values }
}

const analyzerLive = async (equipo, influxName) => {
	const { serial, brand, version } = datosDe(equipo)
	// El analizador arma su topic en minúsculas (ver Element.controller).
	const data = { serial, brand: brand?.toLowerCase(), version: version?.toLowerCase() }
	const metrology = await withTimeout(getDataAnalyzer(data, influxName))
	if (!(metrology instanceof Map) || metrology.size === 0) return { state: 'offline', values: [] }
	const values = [...metrology.entries()]
		.slice(0, 8)
		.map(([key, entries]) => ({ key, value: round(entries?.[0]?.value), unit: '' }))
		.filter((v) => v.value !== null && v.value !== undefined && typeof v.value !== 'object')
	return { state: null, values }
}

const SOURCES = {
	[TIPO.RECLOSER]: recloserLive,
	[TIPO.MEDIDOR]: meterLive,
	[TIPO.ANALIZADOR]: analyzerLive,
}

// Alarma activa del equipo, por el mismo camino que la tabla de inicio: los
// eventos marcados para destello (`flash_screen`) contrastados contra lo que
// haya en Influx. Sólo aplica a reconectadores.
const alarmaDe = async (db, influxName, eventosActivos, equipo) => {
	if (equipo.equipmentmodels?.type !== TIPO.RECLOSER) return false
	try {
		const flash = await withTimeout(getEventsInflux(db, influxName, eventosActivos, { id: equipo.id }))
		return flash.length > 0 && flash[0].some((a) => a.statusAlert === 1)
	} catch {
		return false
	}
}

const getLiveData = async (db, elementos, influxName) => {
	const vinculados = (elementos || []).filter((e) => e.equipmentId)
	if (!vinculados.length) return {}

	// Un solo findAll por equipo distinto, no uno por elemento: en un plano el
	// mismo equipo puede estar vinculado a más de un símbolo.
	const ids = [...new Set(vinculados.map((e) => e.equipmentId))]
	const encontrados = await Promise.all(ids.map((id) => getEquipment(db, { id })))
	const porId = new Map()
	encontrados.flat().forEach((equipo) => porId.set(String(equipo.id), equipo))

	const eventosActivos = await EventsCustom(db, { flash_screen: 1 })

	const results = await Promise.all(
		vinculados.map(async (el) => {
			const equipo = porId.get(String(el.equipmentId))
			const base = {
				equipmentId: el.equipmentId,
				tipo: equipo?.equipmentmodels?.type ?? null,
				serial: equipo?.serial ?? null,
			}
			try {
				if (!equipo) throw new Error('El equipo vinculado ya no existe')
				const source = SOURCES[equipo.equipmentmodels?.type]
				if (!source) throw new Error(`Tipo de equipo sin datos en vivo: ${equipo.equipmentmodels?.type}`)
				const [live, alarm] = await Promise.all([
					source(equipo, influxName),
					alarmaDe(db, influxName, eventosActivos, equipo),
				])
				return [el.id, { ...base, ...live, alarm, error: null }]
			} catch (e) {
				return [el.id, { ...base, state: null, alarm: false, values: [], error: e.message }]
			}
		})
	)
	return Object.fromEntries(results)
}

module.exports = { getLiveData }
