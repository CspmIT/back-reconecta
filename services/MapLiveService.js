/**
 * Datos en vivo del mapa, agregados.
 *
 * A diferencia de /Elements, que consulta Influx una vez por equipo, aca se
 * arma UN filtro multi-topic por familia y canal, asi que el total de consultas
 * no depende de cuantos equipos haya. Sigue el patron que ya usa getAcReclosers.
 *
 * El estado y la alarma se devuelven como dos dimensiones separadas
 * (`st` + `alarm`) en lugar del valor 0-7 mezclado que arma hoy el front.
 *
 * Cada elemento trae ademas TODOS sus equipos con la medicion de cada uno
 * (`equipments`), para que la tabla del panel pueda desplegarlos: ET1 y CE01
 * tienen 7 medidores cada uno y antes de esto la tabla los mostraba vacios.
 * Los campos del elemento en si (st/v/i) siguen saliendo del reconectador
 * principal y NO cambiaron: son los que pintan el marcador del mapa.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */
const { ConsultaInflux } = require('./InfluxServices')
const { getEventsInflux, EventsCustom } = require('./EventService')

const FIELDS_STATE = ['ac', 'd/c']

// Los seriales y marcas se interpolan dentro de una query Flux. Cualquier cosa
// fuera de este set podria romper o inyectar la consulta, asi que se descarta.
const SAFE_TOPIC_PART = /^[A-Za-z0-9._-]+$/

/*
 * Las tres familias de equipos, cada una con su topic, sus campos y su unidad.
 *
 * Las unidades NO son homogeneas y no se normalizan aca, porque no hay con que:
 *  - el reconectador publica la primaria real (13000 = 13 kV);
 *  - el medidor publica el SECUNDARIO del transformador de medicion (~65 V).
 *    La relacion de transformacion vendria de los campos VT_0/VT_1, pero los
 *    ITRON instalados no los publican (verificado en los tres seriales: solo
 *    llegan V_n e I_n), y la unica fila cargada a mano en MeterTransformRatios
 *    esta desactivada. Convertir con un factor inventado seria peor que no
 *    convertir;
 *  - el analizador publica baja tension real (~227 V), consumo interno.
 * Por eso cada equipo viaja con su `unit` y el front muestra el valor tal como
 * lo publica el equipo, que es lo que ya hacen el tablero del medidor y el del
 * analizador.
 */
const FAMILIES = {
	// Reconectador
	1: {
		kind: 'recloser',
		unit: 'kV',
		fields: ['I_f_0', 'I_f_1', 'I_f_2', 'V_L_ABC_0', 'V_L_ABC_1', 'V_L_ABC_2'],
		v: ['V_L_ABC_0', 'V_L_ABC_1', 'V_L_ABC_2'],
		i: ['I_f_0', 'I_f_1', 'I_f_2'],
		// El topic del reconectador NO lleva el modelo: 'Form 5' tiene un espacio
		// y exigirle el formato de un topic descartaba al COOPER de RE02.
		parts: (model, serial) => [model.name, serial],
		topics: (model, serial) => {
			const prefix = `coop/energia/Reconectadores/${model.name}/${serial}/status`
			return { state: [`${prefix}/channel_bin`], meter: [`${prefix}/channel_ain`, `${prefix}/channel_ain_2`] }
		},
	},
	// Medidor
	2: {
		kind: 'meter',
		unit: 'V',
		fields: ['V_0', 'V_1', 'V_2', 'I_0', 'I_1', 'I_2'],
		v: ['V_0', 'V_1', 'V_2'],
		i: ['I_0', 'I_1', 'I_2'],
		parts: (model, serial) => [model.name, model.brand, serial],
		topics: (model, serial) => ({
			state: [],
			meter: [`coop/energia/Medidor/${model.name}/${model.brand}/${serial}/SCADA`],
		}),
	},
	// Analizador de red
	3: {
		kind: 'analyzer',
		unit: 'V',
		fields: ['f_0_v', 'f_1_v', 'f_2_v', 'f_0_i', 'f_1_i', 'f_2_i'],
		v: ['f_0_v', 'f_1_v', 'f_2_v'],
		i: ['f_0_i', 'f_1_i', 'f_2_i'],
		/*
		 * El analizador es el unico que publica marca y modelo en MINUSCULAS.
		 * Verificado contra Influx: POWERMETER/SMART no devuelve nada y
		 * powermeter/smart devuelve las 14 metricas. Es la misma conversion que
		 * hace getDataAnalyzer desde Element.controller.
		 */
		parts: (model, serial) => [model.name, model.brand, serial],
		topics: (model, serial) => ({
			state: [],
			meter: [`coop/energia/Analizador/${model.name.toLowerCase()}/${model.brand.toLowerCase()}/${serial}/inst`],
		}),
	},
}

const num = (v) => (v === null || v === undefined ? null : parseFloat(v))

/**
 * Una sola consulta con todos los topics y campos pedidos. Sin aggregateWindow:
 * `last()` ya devuelve el ultimo punto por serie y evita recorrer ventanas de
 * 10ms sobre el rango completo.
 */
const lastByTopic = async (topics, fields, influxName, range = '-3m') => {
	if (!topics.length || !fields.length) return []
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
 * distintos. El MARCADOR muestra un solo estado y una sola medicion, asi que
 * hay que elegir uno y tomar TODO de ese: mezclar campos de equipos distintos
 * daba filas imposibles (estado del instalado con las tensiones en cero del de
 * prueba) y encima cambiantes segun quien publico ultimo. La tabla si los
 * muestra a los dos, cada uno con lo suyo (ver `equipments`).
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
 * Arma el mapa topic -> equipo para TODAS las familias.
 *
 * Los pedidos se agrupan por (familia, canal) porque cada familia publica sus
 * propios campos: pedir la union de los campos de las tres a todos los topics
 * traeria filas vacias y encarece la consulta al balde.
 */
const buildTopicIndex = (elements) => {
	const byTopic = new Map()
	// clave `${type}:${canal}` -> lista de topics
	const grupos = new Map()
	const descartados = []

	const agregar = (clave, topics, ref) => {
		if (!grupos.has(clave)) grupos.set(clave, [])
		topics.forEach((t) => {
			grupos.get(clave).push(t)
			byTopic.set(t, ref)
		})
	}

	elements.forEach((element) => {
		;(element.equipments || []).forEach((equipment) => {
			const model = equipment.equipmentmodels
			const family = FAMILIES[model?.type]
			if (!family) return

			const serial = equipment.serial
			// Se validan SOLO las partes que esta familia interpola en su topic
			const partes = family.parts(model, serial)
			const invalidas = partes.filter((p) => !p || !SAFE_TOPIC_PART.test(p))
			if (invalidas.length) {
				descartados.push({ id_equipment: equipment.id, model: model.name, serial, invalidas })
				return
			}

			const ref = { id_element: element.id, id_equipment: equipment.id }
			const { state, meter } = family.topics(model, serial)
			agregar(`${model.type}:state`, state, ref)
			agregar(`${model.type}:meter`, meter, ref)
		})
	})

	return { byTopic, grupos, descartados }
}

/**
 * Agrupa las filas de Influx por EQUIPO: { [id_equipment]: { campo: {value, time} } }
 *
 * El desempate por timestamp resuelve los dos canales de metrologia del
 * reconectador (channel_ain y channel_ain_2 del mismo equipo).
 */
const groupByEquipment = (rows, byTopic) => {
	const out = {}
	rows.forEach((row) => {
		const ref = byTopic.get(row.topic)
		if (!ref) return
		if (!out[ref.id_equipment]) out[ref.id_equipment] = {}
		const previo = out[ref.id_equipment][row._field]
		if (!previo || new Date(row._time) > new Date(previo.time)) {
			out[ref.id_equipment][row._field] = { value: row._value, time: row._time }
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

/**
 * Estado de un medidor o un analizador.
 *
 * No se les inventa cerrado/abierto: un medidor no tiene polos, y derivarlo de
 * la tension (como hace getStatus para el ABM) diria "abierto" cada vez que la
 * medicion cae en cero por cualquier motivo. Solo dos estados honestos:
 * `activo` si llego algo en el rango, `sincom` si no.
 */
const resolvePresence = (meter) => (meter && Object.keys(meter).length > 0 ? 'activo' : 'sincom')

const ultimoTiempo = (...grupos) => {
	const times = grupos
		.filter(Boolean)
		.flatMap((group) => Object.values(group).map((f) => f.time))
		.filter(Boolean)
	return times.length ? times.sort().reverse()[0] : null
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
	const { byTopic, grupos, descartados } = buildTopicIndex(plain)

	// Los eventos activos salen de MySQL y son la entrada de las alarmas, asi
	// que se resuelven antes para poder disparar los pedidos a Influx juntos:
	// son independientes y el total queda en el mas lento, no en la suma.
	const activeEvents = await EventsCustom(db, { flash_screen: 1 })

	const alarmsByEquipment = new Set()

	// Un pedido por (familia, canal). Todos en paralelo: son independientes y el
	// total queda en el mas lento, no en la suma.
	const pedidos = [...grupos.entries()].map(([clave, topics]) => {
		const [type, canal] = clave.split(':')
		const fields = canal === 'state' ? FIELDS_STATE : FAMILIES[type].fields
		return { clave, filas: lastByTopic(topics, fields, influxName) }
	})

	const alarmas = getEventsInflux(db, influxName, activeEvents)
		.then((alarms) => {
			alarms.flat().forEach((a) => {
				if (a?.statusAlert === 1 && a.id_device) alarmsByEquipment.add(a.id_device)
			})
		})
		// Las alarmas no deben tumbar el mapa: si fallan, se degrada sin parpadeos.
		.catch((e) => console.error('getMapLive: alarmas no disponibles ->', e.message))

	const [resultados] = await Promise.all([Promise.all(pedidos.map((p) => p.filas)), alarmas])

	// Dos indices, porque el estado solo lo publica el reconectador.
	const states = {}
	const meters = {}
	pedidos.forEach((p, idx) => {
		const destino = p.clave.endsWith(':state') ? states : meters
		Object.assign(destino, groupByEquipment(resultados[idx], byTopic))
	})

	const data = plain.map((element) => {
		const reclosers = reclosersOf(element)
		const principal = mainRecloser(element)

		/*
		 * Todos los equipos del elemento, cada uno con SU medicion. El orden
		 * pone el principal primero y despues por id, para que la lista no
		 * baile entre pedidos.
		 */
		const equipments = (element.equipments || [])
			.filter((eq) => FAMILIES[eq.equipmentmodels?.type])
			.map((eq) => {
				const family = FAMILIES[eq.equipmentmodels.type]
				const state = states[eq.id]
				const meter = meters[eq.id]
				return {
					id: eq.id,
					serial: eq.serial,
					model: eq.equipmentmodels.name,
					version: eq.equipmentmodels.brand,
					// El id del modelo lo necesita la pestana del tablero, para que
					// abrir el mismo equipo desde el mapa y desde el Home no cree dos
					id_model: eq.equipmentmodels.id,
					description: eq.observation,
					kind: family.kind,
					type: eq.equipmentmodels.type,
					// El marcador del mapa representa a este equipo
					main: principal ? eq.id === principal.id : false,
					st: family.kind === 'recloser' ? resolveState(state) : resolvePresence(meter),
					alarm: alarmsByEquipment.has(eq.id),
					// Unidad en la que publica ESTE equipo; no se normaliza (ver FAMILIES)
					unit: family.unit,
					v: family.v.map((f) => num(meter?.[f]?.value ?? null)),
					i: family.i.map((f) => num(meter?.[f]?.value ?? null)),
					updatedAt: ultimoTiempo(state, meter),
				}
			})
			.sort((a, b) => Number(b.main) - Number(a.main) || a.id - b.id)

		// Los campos del elemento salen del reconectador principal y no cambiaron:
		// son los que pintan el marcador del mapa.
		const state = principal ? states[principal.id] : null
		const meter = principal ? meters[principal.id] : null

		return {
			id: element.id,
			name: element.name,
			description: element.description,
			type: element.type,
			lat: num(element.lat),
			lon: num(element.lon),
			// Dos dimensiones separadas, no un codigo 0-7
			st: principal ? resolveState(state) : null,
			// La alarma SI mira todos los reconectadores del elemento: si cualquiera
			// tiene un evento activo, el elemento esta en alarma.
			alarm: reclosers.some((eq) => alarmsByEquipment.has(eq.id)),
			// Unidades tal como las publica el equipo; el formateo va en el front
			v: FAMILIES[1].v.map((f) => num(meter?.[f]?.value ?? null)),
			i: FAMILIES[1].i.map((f) => num(meter?.[f]?.value ?? null)),
			updatedAt: ultimoTiempo(state, meter),
			equipments,
		}
	})

	return { data, skipped: descartados }
}

module.exports = {
	getMapLive,
}
