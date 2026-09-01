/**
 * Contadores del panel de tarjetas del Home (ver CardDashboard en el front).
 *
 * Antes el front pedia TRES endpoints cada 10 segundos —/getAllReclosers,
 * /recloserAlarm y /getAcReclosers— y los dos primeros consultaban Influx UNA
 * VEZ POR EQUIPO: con 14 reconectadores eran 29 consultas por ciclo, y las de
 * alarmas barren desde 2022-11-01. Aca todo sale de consultas multi-topic (el
 * mismo motor que usan /map/live y /Elements, ver LiveMeasureService), asi que
 * el total NO depende de cuantos equipos haya: cuatro pedidos a Influx —uno por
 * familia mas el de alarmas— y tres a MySQL, siempre.
 *
 * Las tarjetas de "offline" y "total" cuentan TODOS los equipos y no solo los
 * reconectadores, que es lo que sus titulos dicen desde siempre; las de
 * abiertos, alarma y sin AC siguen siendo de reconectadores porque las otras
 * dos familias no tienen polos ni publican el estado de la alimentacion.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */
const { Op } = require('sequelize')
const { ConsultaInflux } = require('./InfluxServices')
const { FAMILIES, FIELDS_STATE, SAFE_TOPIC_PART, num, lastByTopic, buildTopicIndex, groupByEquipment } = require('./LiveMeasureService')
const { EventsCustom } = require('./EventService')

const RECLOSER = 1

// Estados del reconectador, la misma tabla que devuelve getStatusRecloser
const CERRADO = 0
const ABIERTO = 1
const SIN_TENSION = 2
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
 * Estado del reconectador a partir de `ac` y `d/c`, con la MISMA tabla que
 * getStatusRecloser: se replica en vez de llamarla porque aquella consulta
 * Influx una vez por equipo y aca los dos campos ya vienen en el pedido
 * batcheado. Sin alguno de los dos campos el equipo esta sin señal.
 */
const estadoRecloser = (state) => {
	const ac = num(state?.ac?.value)
	const dc = num(state?.['d/c']?.value)
	if (ac === null || dc === null || isNaN(ac) || isNaN(dc)) return SIN_SENAL
	if (ac === 1 && dc === 1) return CERRADO
	if (dc === 0) return ABIERTO // (ac 1, dc 0) y (ac 0, dc 0)
	return SIN_TENSION // (ac 0, dc 1)
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
 * Reconectadores con al menos una alarma de prioridad 1 activa.
 *
 * Es lo que contaba /recloserAlarm, que ademas armaba el detalle completo de
 * cada evento (nombre, descripcion, fecha, info adicional) para despues quedarse
 * con la cantidad de claves del objeto. Aca solo se necesita el "si o no" por
 * equipo, asi que la consulta pide un unico campo —`events_0`, el id del
 * evento— y la alarma se resuelve con el timestamp de la propia fila.
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

	/*
	 * Los eventos activos, con el mismo alcance que getEventsActive: prioridad 1
	 * y 2. La tarjeta cuenta solo los de prioridad 1, pero el descarte va DESPUES
	 * de resolver el evento y no en el where, igual que /recloserAlarm: si dos
	 * eventos de la misma version comparten id_event_influx, el que gana es el
	 * primero y no el de prioridad 1.
	 */
	const eventos = await EventsCustom(db, { status: 1, priority: { [Op.lte]: 2 } })
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
		if (!evento || evento.priority !== 1) return
		const check = checks.get(equipment.id)
		if (!check || new Date(fila._time) > new Date(check)) enAlarma.add(equipment.id)
	})

	return enAlarma
}

/**
 * Los cinco numeros de las tarjetas del Home.
 *
 * `alarm` vuelve en null si Influx no pudo responder las alarmas: son la parte
 * mas cara de la consulta y no vale tumbar las otras cuatro tarjetas por ellas,
 * igual que hace el mapa.
 */
const getDashboard = async (db, influxName) => {
	const equipments = await db.Equipment.findAll({
		attributes: ['id', 'serial', 'id_model'],
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
			if (equipment.equipmentmodels.type === RECLOSER) {
				const estado = estadoRecloser(datos[equipment.id])
				if (estado === ABIERTO) acc.open++
				if (estado === SIN_SENAL) acc.offline++
				/*
				 * Sin alimentacion AC es el equipo que REPORTA ac en cero, no el que
				 * no reporta nada: ese ya se cuenta como offline. La consulta vieja
				 * no los distinguia porque ante un balde vacio se iba a buscar hasta
				 * un dia atras y daba por bueno un dato de horas antes.
				 */
				if (num(datos[equipment.id]?.ac?.value) === 0) acc.withoutAc++
				return acc
			}
			// El medidor y el analizador no tienen estado: o llego una medicion en
			// su ventana o estan sin comunicacion
			if (!datos[equipment.id] || !Object.keys(datos[equipment.id]).length) acc.offline++
			return acc
		},
		{ open: 0, offline: 0, withoutAc: 0 }
	)

	return {
		...contadores,
		alarm: enAlarma ? enAlarma.size : null,
		total: plain.length,
	}
}

module.exports = {
	getDashboard,
	estadoRecloser,
}
