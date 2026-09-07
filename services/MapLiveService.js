/**
 * Datos en vivo del mapa, agregados.
 *
 * A diferencia de /Elements, que consulta Influx una vez por equipo para el
 * estado, las mediciones salen de LiveMeasureService: un filtro multi-topic por
 * familia y canal, asi que el total de consultas no depende de cuantos equipos
 * haya.
 *
 * El estado y la alarma se devuelven como dos dimensiones separadas
 * (`st` + `alarm`) en lugar del valor 0-7 mezclado que arma hoy el front.
 *
 * Cada elemento trae ademas TODOS sus equipos con la medicion de cada uno
 * (`equipments`), para que la tabla del panel pueda desplegarlos: ET1 y CE01
 * tienen 7 medidores cada uno y antes de esto la tabla los mostraba vacios.
 * Los campos del elemento en si (st/v/i) siguen saliendo del reconectador
 * principal: son los que pintan el marcador del mapa.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */
const { getEventsInflux, EventsCustom } = require('./EventService')
const { FAMILIES, num, fetchByEquipment, groupsOf, measuresOf } = require('./LiveMeasureService')

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

	// Los eventos activos salen de MySQL y son la entrada de las alarmas, asi
	// que se resuelven antes para poder disparar los pedidos a Influx juntos:
	// son independientes y el total queda en el mas lento, no en la suma.
	const activeEvents = await EventsCustom(db, { flash_screen: 1 })

	const alarmsByEquipment = new Set()

	const alarmas = getEventsInflux(db, influxName, activeEvents)
		.then((alarms) => {
			alarms.flat().forEach((a) => {
				if (a?.statusAlert === 1 && a.id_device) alarmsByEquipment.add(a.id_device)
			})
		})
		// Las alarmas no deben tumbar el mapa: si fallan, se degrada sin parpadeos.
		.catch((e) => console.error('getMapLive: alarmas no disponibles ->', e.message))

	const [fetched] = await Promise.all([fetchByEquipment(plain, influxName, db), alarmas])
	const { states, meters, powers, overrides, skipped } = fetched

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
				const power = powers[eq.id]
				const medicion = measuresOf(eq.equipmentmodels.type, groupsOf(fetched, eq.id), overrides.get(eq.id))
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
					units: medicion.units,
					// Relacion de transformacion aplicada, null si no se convirtio
					tx: medicion.tx,
					// La tension es compuesta; esto dice si la publica el equipo o
					// si se derivo de la de fase
					vDerived: medicion.vDerived,
					// Aparente, activa y reactiva del equipo; la tension y la
					// corriente si van por fase
					power: medicion.power,
					v: medicion.v,
					i: medicion.i,
					updatedAt: ultimoTiempo(state, meter, power),
				}
			})
			.sort((a, b) => Number(b.main) - Number(a.main) || a.id - b.id)

		// Los campos del elemento salen del reconectador principal y no cambiaron:
		// son los que pintan el marcador del mapa.
		const state = principal ? states[principal.id] : null
		const meter = principal ? meters[principal.id] : null
		const power = principal ? powers[principal.id] : null
		const medicion = principal
			? measuresOf(1, groupsOf(fetched, principal.id), overrides.get(principal.id))
			: measuresOf(1, {})

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
			power: medicion.power,
			v: medicion.v,
			vDerived: medicion.vDerived,
			i: medicion.i,
			updatedAt: ultimoTiempo(state, meter, power),
			equipments,
		}
	})

	return { data, skipped }
}

module.exports = {
	getMapLive,
}
