/**
 * Contadores del panel de tarjetas del Home (ver CardDashboard en el front).
 *
 * Antes el front pedia TRES endpoints cada 10 segundos —/getAllReclosers,
 * /recloserAlarm y /getAcReclosers— y los dos primeros consultaban Influx UNA
 * VEZ POR EQUIPO: con 14 reconectadores eran 29 consultas por ciclo, y las de
 * alarmas barren desde 2022-11-01. Los dos ultimos se borraron junto con este
 * cambio porque no los usaba nadie mas; /getAllReclosers sigue en pie, lo usan
 * el tablero del reconectador y la configuracion de notificaciones. Aca todo sale de consultas multi-topic (el
 * mismo motor que usan /map/live y /Elements, ver LiveMeasureService), asi que
 * el total NO depende de cuantos equipos haya: cuatro pedidos a Influx —uno por
 * familia mas el de alarmas— y tres a MySQL, siempre.
 *
 * Las tarjetas de "offline" y "total" cuentan TODOS los equipos y no solo los
 * reconectadores, que es lo que sus titulos dicen desde siempre; las de
 * abiertos, cerrados, sin tension, alarma y sin AC son de reconectadores porque
 * las otras dos familias no tienen polos ni publican el estado de la
 * alimentacion.
 *
 * `open` son los abiertos que NO deberian estarlo y `openPlanned` los de
 * anillado, que estan abiertos por configuracion (ver CONFIG_ESTANDAR).
 *
 * Se devuelven TODOS los contadores siempre, esten o no en pantalla: cada
 * usuario elige que tarjetas ve y en que orden (UserPref, modulo 'dashboard'),
 * y ninguno cuesta una consulta aparte —salen del mismo recorrido de los mismos
 * datos—, asi que filtrar por preferencia no ahorraria nada y obligaria a
 * mandar la seleccion en cada pedido.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */
const { ConsultaInflux } = require('./InfluxServices')
const { FAMILIES, FIELDS_STATE, SAFE_TOPIC_PART, num, lastByTopic, buildTopicIndex, groupByEquipment } = require('./LiveMeasureService')
const { EventsCustom } = require('./EventService')

const RECLOSER = 1
const MEDIDOR = 2

/*
 * Configuracion del reconectador, la que se carga en el ABM (Equipment.
 * configuration): 1 es la estandar y CUALQUIER otro valor cuenta como no
 * estandar, o sea punto de anillado. La columna es `int NULL DEFAULT 1`.
 *
 * Un reconectador abierto solo es una novedad si su configuracion es la
 * estandar; el de anillado esta abierto porque asi tiene que estar y no vale
 * llamar la atencion sobre el todos los dias. Por eso van en dos contadores.
 *
 * NULL se toma como estandar y no como "distinto de 1": la columna ya tiene
 * default 1, asi que un NULL es alguien que lo escribio a proposito y no
 * informacion. Y la asimetria manda —un abierto de verdad clasificado como
 * anillado se degrada a una nota que nadie mira, mientras que un anillado
 * clasificado como abierto se ve y se corrige cargando su configuracion.
 */
const CONFIG_ESTANDAR = 1

const esAnillado = (equipment) =>
	equipment.configuration !== null &&
	equipment.configuration !== undefined &&
	Number(equipment.configuration) !== CONFIG_ESTANDAR

// Posicion del reconectador
const CERRADO = 0
const ABIERTO = 1
const SIN_SENAL = 3

/*
 * El canal que alcanza para saber si el equipo esta vivo. El reconectador
 * publica su estado en channel_bin (canal `state`), el medidor y el analizador
 * no tienen estado y su presencia se mide por si llego una medicion (canal
 * `meter`). Los demas canales de LiveMeasureService —potencia, metrologia del
 * reconectador— no se piden: las tarjetas no muestran mediciones.
 */
const CANAL_PRESENCIA = { 1: 'state', 2: 'meter', 3: 'meter' }

// Los eventos del reconectador, el mismo topic que consulta getEventCheckRecloserOld
const topicEventos = (equipment) =>
	`coop/energia/Reconectadores/${equipment.equipmentmodels.name}/${equipment.serial}/status/channel_events`

/**
 * Posicion del reconectador, SOLO a partir de `d/c`.
 *
 * Es la convencion del resto del sistema: el mapa (resolveState en
 * MapLiveService) y la columna Estado de la tabla general miran `d/c` y nada
 * mas. Antes esto replicaba la tabla de getStatusRecloser, que exige tambien
 * `ac` y sin el da "sin señal" — y hay modelos que NO publican `ac`: el ABB
 * RER615 instalado manda Cmaniob, ar, blck, d/c, grp y local, sin ac. Ese
 * equipo aparecia abierto en la tabla y en el mapa, pero el panel lo contaba
 * como sin comunicacion y lo dejaba afuera de "reconectadores abiertos".
 *
 * La alimentacion es otra pregunta y tiene sus propias tarjetas; `ac` se usa
 * solo para esas.
 */
const posicionRecloser = (state) => {
	const dc = num(state?.['d/c']?.value)
	if (dc === null || isNaN(dc)) return SIN_SENAL
	return dc === 0 ? ABIERTO : CERRADO
}

/**
 * Ultimo dato de cada equipo, un pedido por familia y nada mas.
 *
 * Se apoya en los primitivos de LiveMeasureService pero pide SOLO el canal de
 * presencia de cada familia: reusar fetchByEquipment habria traido tambien
 * metrologia y potencia, que aca no se miran.
 */
const presenciaPorEquipo = async (equipments, influxName) => {
	const { byTopic, grupos, descartados } = buildTopicIndex([{ id: null, equipments }])

	const pedidos = [...grupos.entries()]
		.filter(([clave, topics]) => {
			const [type, canal] = clave.split(':')
			return topics.length && canal === CANAL_PRESENCIA[type]
		})
		.map(([clave, topics]) => {
			const [type, canal] = clave.split(':')
			const family = FAMILIES[type]
			const fields = canal === 'state' ? FIELDS_STATE : family.fields
			return lastByTopic(topics, fields, influxName, family.range).then((rows) => groupByEquipment(rows, byTopic))
		})

	const resultados = await Promise.all(pedidos)
	return { datos: Object.assign({}, ...resultados), descartados }
}

/**
 * Ultima verificacion de alarma de cada reconectador, en UNA consulta.
 *
 * getDateCheck trae la fila mas nueva por `createdAt` y de ahi saca `date_check`;
 * aca se toma el MAX del propio `date_check`, que es la fecha que despues se
 * compara. Difieren solo si alguien cargo a mano una verificacion vieja despues
 * de una nueva, y en ese caso el MAX es lo que corresponde.
 */
const verificacionesPorEquipo = async (db) => {
	const filas = await db.Logs_check_alarms.findAll({
		attributes: ['id_device', [db.sequelize.fn('MAX', db.sequelize.col('date_check')), 'date_check']],
		where: { type: 'Reconectador' },
		group: ['id_device'],
		raw: true,
	})
	return new Map(filas.map((f) => [f.id_device, f.date_check]))
}

/**
 * Reconectadores con al menos una alarma activa.
 *
 * "En alarma" es lo MISMO que hace parpadear la fila en la tabla general:
 * eventos con `flash_screen`, sin mirar prioridad. Antes contaba solo los de
 * prioridad 1 —lo que hacia el viejo /recloserAlarm— y no coincidia con el
 * filtro: de los eventos de reconectador, 34 definiciones son de prioridad 1 y
 * 81 tienen flash_screen, con 49 de prioridad 2 que parpadean y quedaban fuera
 * del numero. La tarjeta decia 1 y al filtrar salian 4.
 *
 * El where es identico al de listElements —solo `flash_screen: 1`, sin condicion
 * de status— justamente para que no puedan volver a separarse.
 *
 * De cada evento solo se necesita el "si o no" por equipo, asi que la consulta
 * pide un unico campo, `events_0`, el id del evento; el endpoint viejo armaba el
 * detalle completo (nombre, descripcion, fecha, info adicional) para despues
 * quedarse con la cantidad de claves del objeto.
 *
 * Un evento esta activo cuando llego DESPUES de la ultima verificacion; sin
 * verificacion, cualquier evento cuenta. Es el mismo criterio de
 * getEventCheckRecloserOld.
 */
const conAlarmaActiva = async (db, influxName, reclosers) => {
	const byTopic = new Map()
	reclosers.forEach((equipment) => {
		const partes = FAMILIES[RECLOSER].parts(equipment.equipmentmodels, equipment.serial)
		if (partes.some((p) => !p || !SAFE_TOPIC_PART.test(p))) return
		byTopic.set(topicEventos(equipment), equipment)
	})
	if (!byTopic.size) return new Set()

	// Los eventos que hacen parpadear la fila, el mismo conjunto que listElements
	const eventos = await EventsCustom(db, { flash_screen: 1 })
	if (!eventos.length) return new Set()

	const [checks, filas] = await Promise.all([
		verificacionesPorEquipo(db),
		/*
		 * El rango arranca en 2022-11-01 igual que la consulta original: un evento
		 * viejo que nunca se verifico sigue estando activo, asi que acortarlo
		 * cambiaria el numero. El `limit` de Flux se aplica por serie, o sea 200
		 * eventos por equipo, tambien como antes.
		 */
		ConsultaInflux(
			`|> range(start: 2022-11-01)
			|> filter(fn: (r) => ${[...byTopic.keys()].map((t) => `r["topic"] == "${t}"`).join(' or ')})
			|> filter(fn: (r) => r["_field"] == "events_0")
			|> sort(columns: ["_time"], desc: true)
			|> limit(n: 200)`,
			influxName
		),
	])

	const enAlarma = new Set()
	;(filas || []).forEach((fila) => {
		const equipment = byTopic.get(fila.topic)
		if (!equipment || enAlarma.has(equipment.id)) return
		const evento = eventos.find((e) => e.id_event_influx == fila._value && e.id_version === equipment.id_model)
		if (!evento) return
		const check = checks.get(equipment.id)
		if (!check || new Date(fila._time) > new Date(check)) enAlarma.add(equipment.id)
	})

	return enAlarma
}

/**
 * Todos los contadores de las tarjetas del Home.
 *
 * Van siempre completos, sin mirar que tarjetas tiene elegidas el usuario: son
 * el mismo recorrido sobre los mismos datos, asi que ninguno cuesta una consulta
 * de mas y el front puede cambiar la seleccion sin volver a pedir.
 *
 * `alarm` vuelve en null si Influx no pudo responder las alarmas: son la parte
 * mas cara de la consulta y no vale tumbar el resto de las tarjetas por ellas,
 * igual que hace el mapa.
 */
const getDashboard = async (db, influxName) => {
	const equipments = await db.Equipment.findAll({
		attributes: ['id', 'serial', 'id_model', 'configuration'],
		include: [
			{
				model: db.EquipmentModel,
				as: 'equipmentmodels',
				attributes: ['id', 'name', 'brand', 'type'],
				required: true,
			},
		],
	})

	// Solo los equipos de una familia conocida: del resto no hay topic que consultar
	const plain = equipments.map((e) => (e.toJSON ? e.toJSON() : e)).filter((e) => FAMILIES[e.equipmentmodels.type])
	const reclosers = plain.filter((e) => e.equipmentmodels.type === RECLOSER)

	const alarmas = conAlarmaActiva(db, influxName, reclosers).catch((e) => {
		console.error('getDashboard: alarmas no disponibles ->', e.message)
		return null
	})

	const [{ datos, descartados }, enAlarma] = await Promise.all([presenciaPorEquipo(plain, influxName), alarmas])

	if (descartados.length) {
		console.warn('getDashboard: equipos con marca/serial invalido omitidos ->', JSON.stringify(descartados))
	}

	const contadores = plain.reduce(
		(acc, equipment) => {
			const tipo = equipment.equipmentmodels.type
			const dato = datos[equipment.id]

			if (tipo === RECLOSER) {
				/*
				 * Cada contador es una pregunta independiente, con la MISMA condicion
				 * que el predicado de su tarjeta en el front (ver `matches` en
				 * listCard): asi el numero y las filas que quedan al filtrar por esa
				 * tarjeta no pueden discrepar.
				 *
				 * No son categorias excluyentes a proposito: "cerrados sin tension" es
				 * un subconjunto de "cerrados", y "sin alimentacion AC" cruza las dos
				 * posiciones.
				 */
				const posicion = posicionRecloser(dato)
				const ac = num(dato?.ac?.value)

				if (posicion === ABIERTO) {
					if (esAnillado(equipment)) acc.openPlanned++
					else acc.open++
				}
				if (posicion === CERRADO) {
					acc.closed++
					if (ac === 0) acc.noVoltage++
				}
				if (posicion === SIN_SENAL) acc.offlineReclosers++
				/*
				 * Sin alimentacion AC es el equipo que REPORTA ac en cero, no el que no
				 * lo publica: el ABB no manda ese campo y no por eso esta a bateria.
				 */
				if (ac === 0) acc.withoutAc++
				return acc
			}

			// El medidor y el analizador no tienen estado: o llego una medicion en
			// su ventana o estan sin comunicacion
			if (!dato || !Object.keys(dato).length) {
				if (tipo === MEDIDOR) acc.offlineMeters++
				else acc.offlineAnalyzers++
			}
			return acc
		},
		{ open: 0, openPlanned: 0, closed: 0, noVoltage: 0, offlineReclosers: 0, offlineMeters: 0, offlineAnalyzers: 0, withoutAc: 0 }
	)

	return {
		...contadores,
		// El total de offline es la suma de los tres desgloses y no un contador
		// aparte, para que nunca puedan contradecirse en pantalla
		offline: contadores.offlineReclosers + contadores.offlineMeters + contadores.offlineAnalyzers,
		alarm: enAlarma ? enAlarma.size : null,
		total: plain.length,
	}
}

module.exports = {
	getDashboard,
	posicionRecloser,
}
