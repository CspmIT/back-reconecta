/**
 * Datos en vivo del mapa, agregados.
 *
 * A diferencia de /Elements, que consulta Influx una vez por equipo, aca se
 * arma UN filtro multi-topic por canal y se resuelve todo en dos consultas
 * (estado + metrologia), siguiendo el patron que ya usa getAcReclosers.
 *
 * El estado y la alarma se devuelven como dos dimensiones separadas
 * (`st` + `alarm`) en lugar del valor 0-7 mezclado que arma hoy el front.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */
const { ConsultaInflux } = require('./InfluxServices')
const { getEventsInflux, EventsCustom } = require('./EventService')

const TOPIC_BASE = 'coop/energia/Reconectadores'
const FIELDS_STATE = ['ac', 'd/c']
const FIELDS_METER = ['I_f_0', 'I_f_1', 'I_f_2', 'V_L_ABC_0', 'V_L_ABC_1', 'V_L_ABC_2']

// Los seriales y marcas se interpolan dentro de una query Flux. Cualquier cosa
// fuera de este set podria romper o inyectar la consulta, asi que se descarta.
const SAFE_TOPIC_PART = /^[A-Za-z0-9._-]+$/

const num = (v) => (v === null || v === undefined ? null : parseFloat(v))

/**
 * Una sola consulta con todos los topics y campos pedidos. Sin aggregateWindow:
 * `last()` ya devuelve el ultimo punto por serie y evita recorrer ventanas de
 * 10ms sobre el rango completo.
 */
const lastByTopic = async (topics, fields, influxName, range = '-3m') => {
	if (!topics.length) return []
	const topicFilter = topics.map((t) => `r["topic"] == "${t}"`).join(' or ')
	const fieldFilter = fields.map((f) => `r["_field"] == "${f}"`).join(' or ')
	const query = `|> range(start: ${range}, stop: now())
		|> filter(fn: (r) => ${topicFilter})
		|> filter(fn: (r) => ${fieldFilter})
		|> last()`
	const rows = await ConsultaInflux(query, influxName)
	return rows || []
}

/**
 * Reconectadores del elemento (equipmentmodels.type === 1).
 */
const reclosersOf = (element) => (element.equipments || []).filter((eq) => eq.equipmentmodels?.type === 1)

/**
 * El reconectador que REPRESENTA al elemento en el mapa.
 *
 * Un elemento puede tener mas de uno publicando a la vez — caso real: RE02
 * tiene el COOPER/002 instalado y un ABB de prueba, con estados y mediciones
 * distintos. El mapa muestra un solo estado y una sola medicion por elemento,
 * asi que hay que elegir uno y tomar TODO de ese: mezclar campos de equipos
 * distintos daba filas imposibles (estado del instalado con las tensiones en
 * cero del de prueba) y encima cambiantes segun quien publico ultimo.
 *
 * El principal se marca en la base (`Equipment.is_main`, ver el ABM del
 * elemento). Sin marca se usa el mas viejo, que es el criterio menos malo para
 * los elementos de un solo reconectador (donde da igual) y avisa por consola
 * cuando hay ambiguedad de verdad.
 */
const mainRecloser = (element) => {
	const reclosers = reclosersOf(element)
	if (reclosers.length <= 1) return reclosers[0] || null
	const marcado = reclosers.find((eq) => eq.is_main)
	if (marcado) return marcado
	const porAntiguedad = [...reclosers].sort((a, b) => a.id - b.id)
	console.warn(
		`getMapLive: el elemento ${element.id} (${element.name}) tiene ${reclosers.length} reconectadores y ninguno marcado como principal; se usa el equipo ${porAntiguedad[0].id}`
	)
	return porAntiguedad[0]
}

/**
 * Arma el mapa topic -> elemento, con el reconectador principal de cada uno.
 */
const buildTopicIndex = (elements) => {
	const byTopic = new Map()
	const topicsState = []
	const topicsMeter = []
	const descartados = []

	elements.forEach((element) => {
		const equipment = mainRecloser(element)
		if (equipment) {
			const brand = equipment.equipmentmodels.name
			const serial = equipment.serial
			if (!brand || !serial || !SAFE_TOPIC_PART.test(brand) || !SAFE_TOPIC_PART.test(serial)) {
				descartados.push({ id_equipment: equipment.id, brand, serial })
				return
			}
			const prefix = `${TOPIC_BASE}/${brand}/${serial}/status`
			const ref = { id_element: element.id, id_equipment: equipment.id }

			const stateTopic = `${prefix}/channel_bin`
			topicsState.push(stateTopic)
			byTopic.set(stateTopic, ref)
			;[`${prefix}/channel_ain`, `${prefix}/channel_ain_2`].forEach((t) => {
				topicsMeter.push(t)
				byTopic.set(t, ref)
			})
		}
	})

	return { byTopic, topicsState, topicsMeter, descartados }
}

/**
 * Agrupa las filas de Influx por elemento: { [id_element]: { campo: {value, time} } }
 *
 * Solo hay un equipo por elemento en `byTopic` (ver mainRecloser), asi que el
 * desempate por timestamp de abajo resuelve unicamente lo que tiene que
 * resolver: los dos canales de metrologia de ESE equipo.
 */
const groupByElement = (rows, byTopic) => {
	const out = {}
	rows.forEach((row) => {
		const ref = byTopic.get(row.topic)
		if (!ref) return
		if (!out[ref.id_element]) out[ref.id_element] = {}
		const previo = out[ref.id_element][row._field]
		// channel_ain y channel_ain_2 del mismo equipo: gana el mas reciente
		if (!previo || new Date(row._time) > new Date(previo.time)) {
			out[ref.id_element][row._field] = { value: row._value, time: row._time }
		}
	})
	return out
}

/**
 * Estado del reconectador segun `d/c`, respetando la semantica actual:
 * 1 = cerrado, 0 = abierto, sin dato = sin comunicacion.
 *
 * Se devuelve como texto y NO como color: la convencion de la casa es
 * cerrado = rojo y abierto = verde (ver getIcon en el front). El mockup del
 * rediseno los tiene invertidos; esta confirmado que el mockup esta mal y que
 * la convencion actual es la correcta para los operadores. No seguir el mockup.
 */
const resolveState = (state) => {
	const dc = state?.['d/c']
	if (!dc || dc.value === null || dc.value === undefined) return 'sincom'
	return Number(dc.value) === 1 ? 'cerrado' : 'abierto'
}

const getMapLive = async (db, influxName) => {
	const elements = await db.Element.findAll({
		attributes: ['id', 'name', 'description', 'type', 'lat', 'lon'],
		include: [
			{
				model: db.Equipment,
				as: 'equipments',
				attributes: ['id', 'serial', 'observation', 'is_main'],
				include: [{ model: db.EquipmentModel, as: 'equipmentmodels', attributes: ['id', 'name', 'brand', 'type'], required: false }],
			},
		],
	})

	const plain = elements.map((e) => (e.toJSON ? e.toJSON() : e))
	const { byTopic, topicsState, topicsMeter, descartados } = buildTopicIndex(plain)

	// Los eventos activos salen de MySQL y son la entrada de las alarmas, asi
	// que se resuelven antes para poder disparar los tres pedidos a Influx
	// juntos: son independientes y el total queda en el mas lento, no en la suma.
	const activeEvents = await EventsCustom(db, { flash_screen: 1 })

	const alarmsByEquipment = new Set()
	const [stateRows, meterRows] = await Promise.all([
		lastByTopic(topicsState, FIELDS_STATE, influxName),
		lastByTopic(topicsMeter, FIELDS_METER, influxName),
		// Una sola llamada sin filtro de id: resuelve las alarmas de todos los
		// reconectadores de una vez, en lugar de una llamada por equipo.
		// Las alarmas no deben tumbar el mapa: si fallan, se degrada sin parpadeos.
		getEventsInflux(db, influxName, activeEvents)
			.then((alarms) => {
				alarms.flat().forEach((a) => {
					if (a?.statusAlert === 1 && a.id_device) alarmsByEquipment.add(a.id_device)
				})
			})
			.catch((e) => console.error('getMapLive: alarmas no disponibles ->', e.message)),
	])

	const states = groupByElement(stateRows, byTopic)
	const meters = groupByElement(meterRows, byTopic)

	const data = plain.map((element) => {
		// La alarma SI mira todos los reconectadores del elemento: si cualquiera
		// tiene un evento activo, el elemento esta en alarma.
		const reclosers = reclosersOf(element)
		const state = states[element.id]
		const meter = meters[element.id]
		const tieneRecloser = reclosers.length > 0

		const times = [state, meter]
			.filter(Boolean)
			.flatMap((group) => Object.values(group).map((f) => f.time))
			.filter(Boolean)

		return {
			id: element.id,
			name: element.name,
			description: element.description,
			type: element.type,
			lat: num(element.lat),
			lon: num(element.lon),
			// Dos dimensiones separadas, no un codigo 0-7
			st: tieneRecloser ? resolveState(state) : null,
			alarm: reclosers.some((eq) => alarmsByEquipment.has(eq.id)),
			// Unidades tal como las publica el equipo; el formateo va en el front
			v: ['V_L_ABC_0', 'V_L_ABC_1', 'V_L_ABC_2'].map((f) => num(meter?.[f]?.value ?? null)),
			i: ['I_f_0', 'I_f_1', 'I_f_2'].map((f) => num(meter?.[f]?.value ?? null)),
			updatedAt: times.length ? times.sort().reverse()[0] : null,
		}
	})

	return { data, skipped: descartados }
}

module.exports = {
	getMapLive,
}
