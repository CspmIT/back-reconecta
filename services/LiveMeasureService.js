/**
 * Motor de mediciones en vivo por equipo, compartido por el mapa (/map/live) y
 * la tabla general del Home (/Elements).
 *
 * Se arma UN filtro multi-topic por familia y canal, asi que el total de
 * consultas a Influx no depende de cuantos equipos haya: /Elements ya consulta
 * una vez por equipo para el estado y agregarle potencia/tension/corriente con
 * el mismo criterio habria multiplicado esa cuenta cada 10 segundos.
 *
 * Salio de MapLiveService, que era el unico que lo usaba; el comportamiento del
 * mapa no cambia.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */
const { ConsultaInflux } = require('./InfluxServices')

const FIELDS_STATE = ['ac', 'd/c']

// Los seriales y marcas se interpolan dentro de una query Flux. Cualquier cosa
// fuera de este set podria romper o inyectar la consulta, asi que se descarta.
const SAFE_TOPIC_PART = /^[A-Za-z0-9._-]+$/


/*
 * Las tres familias de equipos, cada una con su topic, sus campos, su ventana y
 * sus unidades.
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
 * Por eso cada equipo viaja con sus unidades (`units`) y el front muestra el
 * valor tal como lo publica el equipo, que es lo que ya hacen el tablero del
 * medidor y el del analizador.
 *
 * La ventana de cada familia es la que ya usaban las consultas del listado, y
 * es la que decide cuando un equipo queda "sin dato": el reconectador publica
 * cada pocos segundos (dataRecloseInflux usa -3m), el medidor y el analizador
 * cada varios minutos (getStatus y getDataAnalyzer usan -30m).
 */
const FAMILIES = {
	// Reconectador
	1: {
		kind: 'recloser',
		unit: 'kV',
		units: { v: 'V', i: 'A', p: 'kW' },
		range: '-3m',
		fields: [
			'I_f_0', 'I_f_1', 'I_f_2',
			'V_L_ABC_0', 'V_L_ABC_1', 'V_L_ABC_2',
			'V_f_ABC_0', 'V_f_ABC_1', 'V_f_ABC_2',
			'FP_f_0', 'FP_f_1', 'FP_f_2',
			'W_1',
		],
		v: ['V_L_ABC_0', 'V_L_ABC_1', 'V_L_ABC_2'],
		i: ['I_f_0', 'I_f_1', 'I_f_2'],
		// El topic del reconectador NO lleva el modelo: 'Form 5' tiene un espacio
		// y exigirle el formato de un topic descartaba al COOPER de RE02.
		parts: (model, serial) => [model.name, serial],
		topics: (model, serial) => {
			const prefix = `coop/energia/Reconectadores/${model.name}/${serial}/status`
			return {
				state: [`${prefix}/channel_bin`],
				meter: [`${prefix}/channel_ain`, `${prefix}/channel_ain_2`],
				// La potencia viene en channel_ain, junto con tension y corriente
				power: [],
			}
		},
		/*
		 * El reconectador NO publica la potencia por fase: W_0 es la aparente
		 * (kVA), W_1 la activa (kW) y W_2 la reactiva (kVAr), las tres TOTALES,
		 * igual que el tablero del reconectador (ver Objects.jsx en el front).
		 * Verificado contra Influx en el NOJA de SETA64: 12.9 kV y 82 A dan 1832
		 * kVA contra W_0 = 1855, y con FP 0.98 dan 1818 kW contra W_1 = 1818.
		 *
		 * Asi que la activa por fase se DERIVA como V_fase * I * FP_fase, y la
		 * comprobacion es que la suma de las tres de igual al W_1 publicado:
		 * contra los 14 reconectadores instalados el desvio queda por debajo del
		 * 1% en todos los que tienen carga (COOPER/002 426.5 contra 427.56,
		 * NOJA/18164214001 1908.6 contra 1904). Los unicos que se van son los que
		 * estan en cero, donde el FP publicado es ruido.
		 *
		 * La tension de fase sale de V_f_ABC cuando el equipo la publica (NOJA,
		 * ABB) y de V_L_ABC cuando no (COOPER): ese campo del COOPER trae la
		 * tension de FASE aunque se llame de linea, y esta verificado por la
		 * aparente, 3 * 7822.7 V * 17.79 A = 417.4 kVA contra W_0 = 417.39.
		 *
		 * El SENTIDO del flujo sale del W_1 publicado y no del signo del FP: el
		 * COOPER de RE02 publica los tres FP en positivo y la activa total en
		 * negativo, asi que tomar el signo por fase daba tres fases positivas
		 * debajo de un total negativo. Los unicos equipos que publican FP
		 * negativo son los que estan en cero, donde es ruido.
		 */
		power: (meter) => {
			const total = num(meter?.W_1?.value ?? null)
			const sentido = total !== null && total < 0 ? -1 : 1
			return [0, 1, 2].map((n) => {
				const v = num(meter?.[`V_f_ABC_${n}`]?.value ?? meter?.[`V_L_ABC_${n}`]?.value ?? null)
				const i = num(meter?.[`I_f_${n}`]?.value ?? null)
				/*
				 * Un FP en 0 con corriente circulando no es coseno cero, es el
				 * equipo que no lo esta reportando (caso real: el NOJA de RE11
				 * publica FP_f = 0 en las tres fases con 3 A y 56 kW de W_1).
				 * Mejor sin dato que tres ceros que contradicen al equipo.
				 */
				const fp = num(meter?.[`FP_f_${n}`]?.value ?? null)
				if ([v, i, fp].some((x) => x === null || isNaN(x)) || fp === 0) return null
				return (sentido * Math.abs(v * i * fp)) / 1000
			})
		},
		// La activa total del equipo, publicada y no derivada
		powerTotal: (meter) => num(meter?.W_1?.value ?? null),
	},
	// Medidor
	2: {
		kind: 'meter',
		unit: 'V',
		units: { v: 'V', i: 'A', p: 'W' },
		range: '-30m',
		fields: ['V_0', 'V_1', 'V_2', 'I_0', 'I_1', 'I_2'],
		v: ['V_0', 'V_1', 'V_2'],
		i: ['I_0', 'I_1', 'I_2'],
		parts: (model, serial) => [model.name, model.brand, serial],
		topics: (model, serial) => {
			const prefix = `coop/energia/Medidor/${model.name}/${model.brand}/${serial}`
			return {
				state: [],
				meter: [`${prefix}/SCADA`],
				/*
				 * status/VI trae tension, corriente y coseno juntos (la potencia se
				 * calcula, ver abajo) y status/Fasorial la relacion de
				 * transformacion. Los dos van en el mismo pedido: son topics
				 * distintos del mismo equipo y se resuelven en una sola consulta.
				 */
				power: [`${prefix}/status/VI`, `${prefix}/status/Fasorial`],
			}
		},
		powerFields: [
			'V_0', 'V_1', 'V_2',
			'I_0', 'I_1', 'I_2',
			'CFi_0', 'CFi_1', 'CFi_2',
			'VT_0', 'VT_1', 'CT_0', 'CT_1',
		],
		/*
		 * Relacion de transformacion, la MISMA que aplica el tablero del medidor
		 * (ver convertV/convertI en MeterContext): la tension se multiplica por
		 * VT_0/VT_1 y la corriente por CT_0/CT_1, con el override manual de
		 * MeterTransformRatios ganandole a lo que reporta el equipo cuando esta
		 * activo.
		 *
		 * Los VT/CT los publica status/Fasorial, no SCADA ni status/VI. Verificado
		 * contra Influx en los 12 medidores: los de ET1 reportan VT 13200:110 y CT
		 * 400:5, 800:5 o 2500:5, y los de baja tension reportan VT 1:1.
		 *
		 * Los que reportan 1:1 midiendo 65 V (el gran consumidor de SETA64) quedan
		 * sin convertir, igual que en el tablero: para esos esta el override
		 * manual, que se carga desde el tablero del medidor.
		 */
		factors: (extra, manual) => {
			const razon = (primary, secondary) => {
				const p = num(primary)
				const s = num(secondary)
				return p && s ? p / s : 1
			}
			if (manual) {
				return {
					v: razon(manual.vt_primary, manual.vt_secondary),
					i: razon(manual.ct_primary, manual.ct_secondary),
					label: `VT ${manual.vt_primary}:${manual.vt_secondary} · CT ${manual.ct_primary}:${manual.ct_secondary} (manual)`,
				}
			}
			const vt = razon(extra?.VT_0?.value, extra?.VT_1?.value)
			const ct = razon(extra?.CT_0?.value, extra?.CT_1?.value)
			if (vt === 1 && ct === 1) return { v: 1, i: 1, label: null }
			return {
				v: vt,
				i: ct,
				label: `VT ${extra?.VT_0?.value ?? 1}:${extra?.VT_1?.value ?? 1} · CT ${extra?.CT_0?.value ?? 1}:${extra?.CT_1?.value ?? 1}`,
			}
		},
		/*
		 * La activa por fase se CALCULA como V * I * cos con la relacion de
		 * transformacion aplicada, o sea del lado primario, igual que la tension y
		 * la corriente de la fila.
		 *
		 * No se toma del registro IAcP_3 de status/P_imp que muestra el tablero
		 * del medidor porque su escala no es la misma en todos los equipos:
		 * verificado contra la medicion convertida de los 12 medidores, tres de
		 * ellos publican kW (83786132: 9504 contra 9507.7 calculados, 83786119:
		 * 2477 contra 2461.2, 83786124: 2415 contra 2379.0) y los otros nueve
		 * publican una escala 10000 veces mas chica. La cuenta, en cambio, cierra
		 * en los tres casos comprobables con menos del 2% de desvio, asi que se
		 * usa para todos por igual.
		 *
		 * Los tres valores salen del MISMO topic (status/VI) para que la cuenta
		 * sea de una sola publicacion.
		 */
		power: (meter, vi, factors) =>
			[0, 1, 2].map((n) => {
				const v = num(vi?.[`V_${n}`]?.value ?? null)
				const i = num(vi?.[`I_${n}`]?.value ?? null)
				const cos = num(vi?.[`CFi_${n}`]?.value ?? null)
				if ([v, i, cos].some((x) => x === null || isNaN(x))) return null
				return v * factors.v * i * factors.i * cos
			}),
	},
	// Analizador de red
	3: {
		kind: 'analyzer',
		unit: 'V',
		units: { v: 'V', i: 'A', p: 'W' },
		range: '-30m',
		fields: ['f_0_v', 'f_1_v', 'f_2_v', 'f_0_i', 'f_1_i', 'f_2_i', 'f_0_p', 'f_1_p', 'f_2_p'],
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
			// La potencia viene en el mismo topic 'inst'
			power: [],
		}),
		/*
		 * f_n_p es la activa por fase en W, no en kW como dice el tablero del
		 * analizador: verificado contra Influx, 228.4 V por 14.7 A dan 3357 W
		 * contra f_0_p = 3316.
		 */
		power: (meter) => ['f_0_p', 'f_1_p', 'f_2_p'].map((f) => num(meter?.[f]?.value ?? null)),
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
			const { state, meter, power } = family.topics(model, serial)
			agregar(`${model.type}:state`, state, ref)
			agregar(`${model.type}:meter`, meter, ref)
			agregar(`${model.type}:power`, power || [], ref)
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
 * Overrides manuales de relacion de transformacion que estan ACTIVOS, indexados
 * por equipo. Es la misma regla que aplica /getMeterTxRatio para el tablero del
 * medidor: sin fila activa se usa la relacion que reporta el equipo, y las filas
 * desactivadas se conservan pero no se aplican.
 */
const manualRatios = async (db) => {
	if (!db?.MeterTransformRatio) return new Map()
	const filas = await db.MeterTransformRatio.findAll({ where: { status: true } })
	return new Map(filas.map((f) => [f.id_equipment, f.get ? f.get({ plain: true }) : f]))
}

/**
 * Consulta Influx para TODOS los equipos de los elementos recibidos.
 *
 * @param {Object} [db] Solo para los overrides manuales de CT/VT; sin `db` se
 * usa la relacion que reporta cada equipo.
 * @returns {Promise<Object>} `{ states, meters, powers, ratios, skipped }`, los
 * tres primeros y `ratios` indexados por id de equipo.
 */
const fetchByEquipment = async (elements, influxName, db = null) => {
	const { byTopic, grupos, descartados } = buildTopicIndex(elements)

	// Un pedido por (familia, canal). Todos en paralelo: son independientes y el
	// total queda en el mas lento, no en la suma.
	const pedidos = [...grupos.entries()].map(([clave, topics]) => {
		const [type, canal] = clave.split(':')
		const family = FAMILIES[type]
		const fields = canal === 'state' ? FIELDS_STATE : canal === 'power' ? family.powerFields : family.fields
		return { clave, canal, filas: lastByTopic(topics, fields, influxName, family.range) }
	})

	// Los overrides salen de MySQL y son independientes de Influx: van juntos
	const [resultados, ratios] = await Promise.all([Promise.all(pedidos.map((p) => p.filas)), manualRatios(db)])

	// Tres indices, porque el estado solo lo publica el reconectador y la
	// potencia del medidor sale de un topic aparte.
	const states = {}
	const meters = {}
	const powers = {}
	pedidos.forEach((p, idx) => {
		const destino = p.canal === 'state' ? states : p.canal === 'power' ? powers : meters
		Object.assign(destino, groupByEquipment(resultados[idx], byTopic))
	})

	return { states, meters, powers, ratios, skipped: descartados }
}

/**
 * Suma de las fases con dato, o null si no llego ninguna.
 */
const sumaFases = (fases) => {
	const validos = (fases || []).filter((x) => x !== null && !isNaN(x))
	if (!validos.length) return null
	return validos.reduce((acc, x) => acc + x, 0)
}

/**
 * Potencia activa, tension y corriente de UN equipo POR FASE, con las unidades
 * en las que las publica. Las tres magnitudes viajan como array de tres para
 * que el front muestre R/S/T y no un promedio.
 *
 * `total` es la activa del equipo entero: la publicada cuando el equipo la
 * publica (el W_1 del reconectador) y la suma de las fases cuando no.
 *
 * En el medidor los tres valores vienen CONVERTIDOS por la relacion de
 * transformacion, igual que en su tablero: `manual` es el override activo de
 * MeterTransformRatios y, sin override, la relacion sale de lo que reporta el
 * equipo en status/Fasorial.
 *
 * `null` en un valor es "sin dato" y no cero: un 0 diria que el equipo no mide
 * nada, que es otra cosa.
 */
const measuresOf = (type, meter, power, manual = null) => {
	const family = FAMILIES[type]
	if (!family) return null
	// El reconectador y el analizador miden directo; solo el medidor va por
	// transformadores de medicion y necesita conversion
	const factors = family.factors ? family.factors(power, manual) : { v: 1, i: 1, label: null }
	const escalar = (value, factor) => (value === null || isNaN(value) ? null : value * factor)
	const p = family.power(meter, power, factors)
	return {
		p,
		total: family.powerTotal ? family.powerTotal(meter, power) : sumaFases(p),
		v: family.v.map((f) => escalar(num(meter?.[f]?.value ?? null), factors.v)),
		i: family.i.map((f) => escalar(num(meter?.[f]?.value ?? null), factors.i)),
		units: family.units,
		// Relacion aplicada, para que el front la pueda aclarar; null si no se
		// convirtio nada
		tx: factors.label,
	}
}

module.exports = {
	FAMILIES,
	FIELDS_STATE,
	SAFE_TOPIC_PART,
	num,
	lastByTopic,
	buildTopicIndex,
	groupByEquipment,
	fetchByEquipment,
	measuresOf,
}
