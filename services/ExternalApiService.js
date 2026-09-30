/**
 * Datos de la API externa (v1). Solo lectura.
 *
 * Todo sale de los mismos motores que usa la app, para que un integrador y el
 * operador vean los mismos numeros:
 *  - instantaneo: LiveMeasureService, igual que el mapa y la tabla general;
 *  - eventos: getEventRecloserOld, igual que el tablero del reconectador;
 *  - alarmas: la misma combinacion que /AllEvents.
 *
 * Lo unico propio es el historico, porque la app no tiene una consulta generica:
 * cada tablero arma la suya. Aca se piden los campos crudos que publica el
 * equipo, limitados a los de su familia.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */
const { ConsultaInflux } = require('./InfluxServices')
const { FAMILIES, SAFE_TOPIC_PART, fetchByEquipment, groupsOf, measuresOf, lastByTopic, groupByEquipment } = require('./LiveMeasureService')
const { resolveState, resolvePresence } = require('./MapLiveService')
const { getEquipment } = require('./ElementService')
const { getEventsDevice, getEventsActive, getEventsInflux, getEventsDeadman } = require('./EventService')
const { getEventRecloserOld } = require('./RecloserServices')

// Tipo de EquipmentModel <-> nombre publico
const TYPE_NAMES = { 1: 'recloser', 2: 'meter', 3: 'analyzer' }
const TYPE_IDS = Object.fromEntries(Object.entries(TYPE_NAMES).map(([id, name]) => [name, Number(id)]))

// Ventanas de agregacion admitidas en el historico
const WINDOWS = { '1m': 60e3, '5m': 300e3, '15m': 900e3, '1h': 3600e3, '1d': 86400e3 }
const MAX_HISTORY_DAYS = 31
// Tope de puntos por variable, para que un rango largo con ventana chica no
// traiga medio balde
const MAX_POINTS = 5000
const MAX_EVENTS = 5000

const httpError = (status, message) => Object.assign(new Error(message), { status })

const plain = (row) => (row?.get ? row.get({ plain: true }) : row)

const serializeEquipment = (row) => {
	const e = plain(row)
	const model = e.equipmentmodels
	const element = e.elements
	return {
		serial: e.serial,
		type: TYPE_NAMES[model?.type] || 'other',
		is_main: e.is_main === true || e.is_main === 1,
		observation: e.observation || null,
		model: model ? { name: model.name, brand: model.brand } : null,
		element: element
			? {
					name: element.name,
					description: element.description || null,
					lat: element.lat !== null ? Number(element.lat) : null,
					lon: element.lon !== null ? Number(element.lon) : null,
				}
			: null,
	}
}

const listEquipments = async (db, { type } = {}) => {
	let filter = null
	if (type) {
		if (!TYPE_IDS[type]) throw httpError(400, `type debe ser uno de: ${Object.keys(TYPE_IDS).join(', ')}`)
		filter = { type: TYPE_IDS[type] }
	}
	const rows = await getEquipment(db, filter)
	return rows.map(serializeEquipment)
}

/**
 * Equipo por serial, en crudo (con modelo y elemento). 404 si no existe.
 *
 * El serial es el identificador publico de la API: es el que conoce el
 * integrador (esta en la chapa del equipo) y no se repite entre equipos. Va
 * siempre como texto, porque muchos llevan ceros a la izquierda (002,
 * 00002440) que un numero perderia.
 */
const findEquipment = async (db, serial) => {
	const value = typeof serial === 'string' ? serial.trim() : ''
	if (!value || value.length > 100) throw httpError(400, 'El serial del equipo es obligatorio')
	const [row] = await getEquipment(db, { serial: value })
	if (!row) throw httpError(404, 'Equipo no encontrado')
	return plain(row)
}

const latestTime = (...groups) => {
	const times = groups
		.filter(Boolean)
		.flatMap((g) => Object.values(g).map((f) => f.time))
		.filter(Boolean)
	return times.length ? times.sort().reverse()[0] : null
}

/**
 * Metrologia instantanea de un equipo, con el mismo calculo que el mapa.
 */
const instant = async (db, influxName, equipment) => {
	const type = equipment.equipmentmodels?.type
	if (!FAMILIES[type]) throw httpError(422, 'El tipo de equipo no publica metrologia')

	const fetched = await fetchByEquipment([{ id: equipment.id_element, equipments: [equipment] }], influxName, db)
	if (fetched.skipped?.length) throw httpError(422, 'El modelo o el serial del equipo no forman un topic valido')

	const groups = groupsOf(fetched, equipment.id)
	const measures = measuresOf(type, groups, fetched.overrides.get(equipment.id))
	const state = type === 1 ? resolveState(fetched.states[equipment.id]) : resolvePresence(groups.meter)

	return {
		serial: equipment.serial,
		type: TYPE_NAMES[type],
		state,
		time: latestTime(fetched.states[equipment.id], groups.meter, groups.power),
		voltage_line: measures.v,
		voltage_line_derived: measures.vDerived,
		voltage_phase: measures.vPhase,
		current: measures.i,
		power: measures.power,
		units: measures.units,
		transform_ratio: measures.tx,
	}
}

/*
 * Unidad de cada campo crudo, por familia. Son las unidades en las que PUBLICA
 * el equipo (ver FAMILIES en LiveMeasureService).
 */
const fieldUnit = (kind, field) => {
	if (kind === 'recloser') {
		if (field.startsWith('I_')) return 'A'
		if (field.startsWith('V_')) return 'V'
		return { W_0: 'kVA', W_1: 'kW', W_2: 'kVAr' }[field] || null
	}
	if (kind === 'meter') return field.startsWith('V_') ? 'V' : 'A'
	const suffix = field.split('_').pop()
	return { v: 'V', i: 'A', p: 'W', q: 'VAr' }[suffix] || null
}

/*
 * Fecha en hora local de Argentina, como la escribe una persona:
 * `dd/mm/aaaa hh:mm` (ej: 25/09/2026 14:30). Argentina no tiene horario de
 * verano, asi que el corrimiento es siempre -03:00.
 */
const LOCAL_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})$/
const AR_OFFSET_HOURS = 3

const parseLocalDate = (value, name) => {
	const match = LOCAL_DATE.exec(String(value).trim())
	if (!match) throw httpError(400, `${name} debe tener el formato dd/mm/aaaa hh:mm (ej: 25/09/2026 14:30)`)
	const [day, month, year, hour, minute] = match.slice(1).map(Number)
	const d = new Date(Date.UTC(year, month - 1, day, hour + AR_OFFSET_HOURS, minute))
	// Date.UTC acomoda los desbordes (31/02 pasa a 03/03): si la fecha vuelta a
	// hora local no coincide con la escrita, no existe
	const local = new Date(d.getTime() - AR_OFFSET_HOURS * 3600e3)
	if (
		hour > 23 ||
		minute > 59 ||
		local.getUTCDate() !== day ||
		local.getUTCMonth() !== month - 1 ||
		local.getUTCFullYear() !== year
	)
		throw httpError(400, `${name} no es una fecha valida`)
	return d
}

/**
 * Relacion de transformacion del medidor, la misma que aplica el instantaneo.
 * Es la VIGENTE: si la instalacion se recableo dentro del rango pedido, los
 * puntos anteriores al cambio quedan con la relacion nueva.
 */
const meterFactors = async (db, influxName, equipment, family) => {
	const model = equipment.equipmentmodels
	const topics = family.topics(model, equipment.serial)
	const byTopic = new Map(topics.ratio.map((t) => [t, { id_equipment: equipment.id }]))
	const [rows, manual] = await Promise.all([
		lastByTopic(topics.ratio, family.ratioFields, influxName, '-7d'),
		db.MeterTransformRatio ? db.MeterTransformRatio.findOne({ where: { id_equipment: equipment.id, status: true } }) : null,
	])
	const ratio = groupByEquipment(rows, byTopic)[equipment.id]
	return family.factors(ratio, plain(manual))
}

/**
 * Series historicas de los campos que publica el equipo, agregadas por ventana.
 */
const history = async (db, influxName, equipment, query = {}) => {
	const type = equipment.equipmentmodels?.type
	const family = FAMILIES[type]
	if (!family) throw httpError(422, 'El tipo de equipo no publica metrologia')

	const model = equipment.equipmentmodels
	const parts = family.parts(model, equipment.serial)
	if (parts.some((p) => !p || !SAFE_TOPIC_PART.test(p)))
		throw httpError(422, 'El modelo o el serial del equipo no forman un topic valido')

	const to = query.to ? parseLocalDate(query.to, 'to') : new Date()
	const from = query.from ? parseLocalDate(query.from, 'from') : new Date(to.getTime() - 24 * 3600e3)
	if (from >= to) throw httpError(400, 'from debe ser anterior a to')
	const span = to - from
	if (span > MAX_HISTORY_DAYS * 86400e3) throw httpError(400, `El rango maximo es de ${MAX_HISTORY_DAYS} dias`)

	const window = query.window || '15m'
	if (!WINDOWS[window]) throw httpError(400, `window debe ser uno de: ${Object.keys(WINDOWS).join(', ')}`)
	if (span / WINDOWS[window] > MAX_POINTS)
		throw httpError(400, `El rango pedido da mas de ${MAX_POINTS} puntos por variable: usá una ventana mas grande`)

	let fields = family.fields
	if (query.fields) {
		const pedidos = String(query.fields)
			.split(',')
			.map((f) => f.trim())
			.filter(Boolean)
		const invalidos = pedidos.filter((f) => !family.fields.includes(f))
		if (invalidos.length)
			throw httpError(400, `Campos no disponibles para ${family.kind}: ${invalidos.join(', ')}. Disponibles: ${family.fields.join(', ')}`)
		fields = pedidos
	}

	const topics = family.topics(model, equipment.serial).meter
	const topicFilter = topics.map((t) => `r["topic"] == "${t}"`).join(' or ')
	const fieldFilter = fields.map((f) => `r["_field"] == "${f}"`).join(' or ')
	const flux = `|> range(start: ${from.toISOString()}, stop: ${to.toISOString()})
		|> filter(fn: (r) => ${topicFilter})
		|> filter(fn: (r) => ${fieldFilter})
		|> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)`

	const [rows, factors] = await Promise.all([
		ConsultaInflux(flux, influxName),
		family.factors ? meterFactors(db, influxName, equipment, family) : { v: 1, i: 1, label: null },
	])

	// Un Map por campo: el reconectador publica en dos topics y un mismo instante
	// podria venir repetido
	const series = Object.fromEntries(fields.map((f) => [f, new Map()]))
	for (const row of rows || []) {
		if (!series[row._field] || row._value === null || row._value === undefined) continue
		let value = Number(row._value)
		if (family.factors) value *= row._field.startsWith('V_') ? factors.v : factors.i
		series[row._field].set(row._time, value)
	}

	return {
		serial: equipment.serial,
		type: family.kind,
		from: from.toISOString(),
		to: to.toISOString(),
		window,
		aggregate: 'mean',
		transform_ratio: factors.label,
		fields: Object.fromEntries(
			fields.map((f) => [
				f,
				{
					unit: fieldUnit(family.kind, f),
					points: [...series[f].entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([t, v]) => ({ t, v })),
				},
			])
		),
	}
}

/**
 * Eventos de un reconectador en un rango. Los medidores y analizadores no
 * publican eventos por equipo.
 */
const events = async (db, influxName, equipment, query = {}) => {
	if (equipment.equipmentmodels?.type !== 1)
		throw httpError(422, 'Por ahora solo los reconectadores publican eventos por equipo')

	const from = query.from ? parseLocalDate(query.from, 'from') : null
	const to = query.to ? parseLocalDate(query.to, 'to') : null
	if (from && to && from > to) throw httpError(400, 'from no puede ser posterior a to')

	const limit = query.limit !== undefined ? Number(query.limit) : 200
	if (!Number.isInteger(limit) || limit < 1 || limit > MAX_EVENTS)
		throw httpError(400, `limit debe ser un entero entre 1 y ${MAX_EVENTS}`)

	const catalog = await getEventsDevice(db, equipment.equipmentmodels.id, 'Reconectador')
	const packs = await getEventRecloserOld(
		{
			serial: equipment.serial,
			brand: equipment.equipmentmodels.name,
			event: catalog.map((item) => ({
				id: item.id,
				id_influx: item.id_event_influx,
				name: item.name,
				priority: item.priority,
				type_var: item.type_var,
				custom: item.customizable,
				id_file: item.index_file,
			})),
			dateStart: from,
			dateEnd: to,
			limit,
		},
		influxName
	)

	return packs
		.sort((a, b) => new Date(b.dateAlert) - new Date(a.dateAlert))
		.map((p) => ({
			date: p.dateAlert,
			code: p.id,
			name: p.event,
			priority: p.priority,
			info: p.infoAdd ?? null,
		}))
}

/**
 * Alarmas vigentes de la cooperativa, con la misma combinacion que /AllEvents:
 * eventos de prioridad alta de los reconectadores mas equipos sin comunicacion.
 */
const alarms = async (db, influxName, query = {}) => {
	const catalog = await getEventsActive(db)
	const [fromInflux, deadman] = await Promise.all([getEventsInflux(db, influxName, catalog), getEventsDeadman(db)])

	const onlyActive = query.active === undefined || query.active === 'true'
	return [...fromInflux.flat(), ...deadman]
		.filter((a) => !onlyActive || a.statusAlert === 1)
		.sort((a, b) => new Date(b.dateAlert) - new Date(a.dateAlert))
		.map((a) => ({
			date: a.dateAlert,
			serial: a.nro_recloser ?? null,
			element: a.name ?? null,
			device_type: a.typeDevice,
			code: a.id,
			name: a.event,
			description: a.description ?? null,
			priority: a.priority,
			active: a.statusAlert === 1,
			info: a.infoAdd ?? null,
		}))
}

module.exports = {
	TYPE_NAMES,
	WINDOWS,
	MAX_HISTORY_DAYS,
	MAX_POINTS,
	MAX_EVENTS,
	listEquipments,
	findEquipment,
	serializeEquipment,
	instant,
	history,
	events,
	alarms,
}
