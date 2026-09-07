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

/*
 * La relacion de transformacion es CONFIGURACION y no medicion: cambia cuando
 * alguien recablea la instalacion, no cada segundo. Va con ventana larga porque
 * su topic publica cada 15 minutos y con la ventana de las mediciones se perdia:
 * verificado, el medidor 83660955 tenia la ultima publicacion 32 minutos atras y
 * la tabla le mostraba la tension SIN convertir y la corriente convertida.
 */
const RATIO_RANGE = '-7d'

/*
 * La tension que se muestra es la COMPUESTA (de linea), que es como se habla de
 * una red de media tension. El unico que la publica es el NOJA; el resto publica
 * la de fase y se pasa a compuesta con raiz(3), que supone sistema equilibrado.
 *
 * El factor esta verificado contra el propio NOJA, que publica las dos:
 * 12900/7433 = 1.735 y 13567/7833 = 1.732 contra raiz(3) = 1.7321. Y en tension
 * el desequilibrio es despreciable, las tres fases difieren menos del 1% en
 * todos los equipos.
 */
const RAIZ_3 = Math.sqrt(3)

/*
 * Los cuatro canales de cada familia. Se pide uno por (familia, canal) porque
 * cada uno tiene sus topics, sus campos y su ventana.
 */
const CHANNELS = ['state', 'meter', 'power', 'ratio']

const channelFields = (family, canal) => {
	if (canal === 'state') return FIELDS_STATE
	if (canal === 'power') return family.powerFields ?? family.fields
	if (canal === 'ratio') return family.ratioFields ?? []
	return family.fields
}

const channelRange = (family, canal) => (canal === 'ratio' ? RATIO_RANGE : family.range)

// Los seriales y marcas se interpolan dentro de una query Flux. Cualquier cosa
// fuera de este set podria romper o inyectar la consulta, asi que se descarta.
const SAFE_TOPIC_PART = /^[A-Za-z0-9._-]+$/


/*
 * Las tres familias de equipos, cada una con su topic, sus campos, su ventana y
 * sus unidades.
 *
 * La tension es siempre la COMPUESTA, para que la columna sea comparable entre
 * modelos: publicada donde el equipo la publica y derivada de la fase donde no
 * (ver RAIZ_3).
 *
 * Las unidades NO son homogeneas y no se normalizan aca, porque no hay con que:
 *  - el reconectador publica la primaria real (13200 V de linea);
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
		units: { v: 'V', i: 'A', s: 'kVA', p: 'kW', q: 'kVAr' },
		range: '-3m',
		fields: [
			'I_f_0', 'I_f_1', 'I_f_2',
			'V_f_ABC_0', 'V_f_ABC_1', 'V_f_ABC_2',
			'V_L_ABC_0', 'V_L_ABC_1', 'V_L_ABC_2',
			'W_0', 'W_1', 'W_2',
		],
		/*
		 * Las dos marcas publican el MISMO nombre de campo para cosas distintas,
		 * asi que la de linea se resuelve por lo que publica cada una. La aparente
		 * publicada (W_0) es el juez, verificado contra los 22 reconectadores:
		 *  - NOJA publica las dos, V_L_ABC de linea (~13400) y V_f_ABC de fase
		 *    (~7800). En el de SETA64, raiz(3) * V_L * I = 1847 y 3 * V_f * I =
		 *    1843, contra W_0 = 1844. Se usa V_L_ABC tal como viene;
		 *  - COOPER publica solo V_L_ABC, y ahi manda la tension de FASE (~7800)
		 *    aunque el campo se llame de linea: en el de RE02, 3 * V_L * I = 89
		 *    contra W_0 = 89, mientras que raiz(3) * V_L * I daria 51. Se pasa a
		 *    compuesta.
		 * Tomar V_L_ABC para las dos era lo que hacia que el NOJA mostrara 12,8 kV
		 * y el COOPER 7,8 kV en la misma columna.
		 *
		 * La regla es por campo publicado y no por marca, igual que en el tablero
		 * del reconectador (ver `asPhase` en boardMetrology): si aparece un equipo
		 * nuevo con la misma maña, sale bien sin tocar nada.
		 */
		voltage: (meter) =>
			[0, 1, 2].map((n) => {
				const linea = primerCampo(meter, `V_L_ABC_${n}`)
				const fase = primerCampo(meter, `V_f_ABC_${n}`)
				// Publica las dos: la de linea es de verdad de linea
				if (linea !== null && fase !== null) return { value: linea, derived: false }
				// Solo el campo de linea: ahi manda la de fase (COOPER)
				if (linea !== null) return { value: linea * RAIZ_3, derived: true }
				if (fase !== null) return { value: fase * RAIZ_3, derived: true }
				return { value: null, derived: false }
			}),
		i: ['I_f_0', 'I_f_1', 'I_f_2'],
		// El topic del reconectador NO lleva el modelo: 'Form 5' tiene un espacio
		// y exigirle el formato de un topic descartaba al COOPER de RE02.
		parts: (model, serial) => [model.name, serial],
		topics: (model, serial) => {
			const prefix = `coop/energia/Reconectadores/${model.name}/${serial}/status`
			return {
				state: [`${prefix}/channel_bin`],
				meter: [`${prefix}/channel_ain`, `${prefix}/channel_ain_2`],
				// Las potencias vienen en channel_ain, junto con tension y corriente
				power: [],
				// Mide directo, sin transformadores de medicion
				ratio: [],
			}
		},
		/*
		 * Las tres potencias que publica el reconectador, TOTALES y sin cuentas de
		 * por medio: son las mismas que muestra su tablero (ver Objects.jsx en el
		 * front), asi que la tabla y el tablero no pueden discrepar.
		 *
		 * Verificado contra Influx en el COOPER de RE02: 3 * 7822.7 V * 17.79 A
		 * dan 417.4 kVA contra W_0 = 417.39, con FP 0.84 dan 350.6 kW contra
		 * W_1 = -349.79 y 226.5 kVAr contra W_2 = -227.73.
		 *
		 * NO se derivan las fases. Se probo con V_fase * I_fase * FP_fase y la
		 * suma cierra contra W_1 en los equipos con carga, pero el FP por fase no
		 * es confiable: con carga casi nula es ruido (el COOPER/001 daba -32.6 kW
		 * derivados contra -3.0 publicados) y 4 de los 14 reconectadores publican
		 * FP_f = 0 de forma intermitente, asi que la celda cambiaba de valor segun
		 * la publicacion que llegara.
		 *
		 * El signo de la activa y la reactiva es el sentido del flujo y se respeta
		 * tal como lo publica el equipo.
		 */
		power: (meter) => ({
			s: num(meter?.W_0?.value ?? null),
			p: num(meter?.W_1?.value ?? null),
			q: num(meter?.W_2?.value ?? null),
		}),
	},
	// Medidor
	2: {
		kind: 'meter',
		unit: 'V',
		units: { v: 'V', i: 'A', s: 'VA', p: 'W', q: 'VAr' },
		range: '-30m',
		fields: ['V_0', 'V_1', 'V_2', 'I_0', 'I_1', 'I_2'],
		// El medidor mide fase en el secundario del VT (65 V de un VT de 110, que
		// es 110/raiz(3)), asi que la compuesta se deriva
		voltage: (meter) => [0, 1, 2].map((n) => derivada(primerCampo(meter, `V_${n}`))),
		i: ['I_0', 'I_1', 'I_2'],
		parts: (model, serial) => [model.name, model.brand, serial],
		topics: (model, serial) => {
			const prefix = `coop/energia/Medidor/${model.name}/${model.brand}/${serial}`
			return {
				state: [],
				meter: [`${prefix}/SCADA`],
				// status/VI trae tension, corriente y coseno juntos, de una sola
				// publicacion, que es con lo que se calculan las potencias
				power: [`${prefix}/status/VI`],
				// La relacion de transformacion, en su propio canal por la ventana
				ratio: [`${prefix}/status/Fasorial`],
			}
		},
		powerFields: ['V_0', 'V_1', 'V_2', 'I_0', 'I_1', 'I_2', 'CFi_0', 'CFi_1', 'CFi_2'],
		ratioFields: ['VT_0', 'VT_1', 'CT_0', 'CT_1'],
		/*
		 * Relacion de transformacion, la MISMA que aplica el tablero del medidor
		 * (ver convertV/convertI en MeterContext): la tension se multiplica por
		 * VT_0/VT_1 y la corriente por CT_0/CT_1, con el override manual de
		 * MeterTransformRatios ganandole a lo que reporta el equipo cuando esta
		 * activo.
		 *
		 * Los VT/CT los publica status/Fasorial, no SCADA ni status/VI, y cada 15
		 * minutos, asi que ese topic va en su propio canal con ventana larga (ver
		 * RATIO_RANGE). Verificado contra Influx en los 12 medidores: los de ET1
		 * reportan VT 13200:110 y CT 400:5, 800:5 o 2500:5, y los de baja tension
		 * reportan VT 1:1.
		 *
		 * Los que reportan 1:1 midiendo 65 V (el gran consumidor de SETA64) quedan
		 * sin convertir, igual que en el tablero: para esos esta el override
		 * manual, que se carga desde el tablero del medidor.
		 */
		factors: (ratio, manual) => {
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
			const vt = razon(ratio?.VT_0?.value, ratio?.VT_1?.value)
			const ct = razon(ratio?.CT_0?.value, ratio?.CT_1?.value)
			if (vt === 1 && ct === 1) return { v: 1, i: 1, label: null }
			return {
				v: vt,
				i: ct,
				label: `VT ${ratio?.VT_0?.value ?? 1}:${ratio?.VT_1?.value ?? 1} · CT ${ratio?.CT_0?.value ?? 1}:${ratio?.CT_1?.value ?? 1}`,
			}
		},
		/*
		 * Las tres potencias se CALCULAN por fase y se suman, con la relacion de
		 * transformacion aplicada, o sea del lado primario igual que la tension y
		 * la corriente de la fila:
		 *   S = V * I,  P = V * I * cos,  Q = raiz(S^2 - P^2)
		 * Los tres valores salen del MISMO topic (status/VI, que trae tension,
		 * corriente y coseno juntos) para que la cuenta sea de una sola
		 * publicacion, y se suman por fase igual que en el tablero del analizador.
		 *
		 * No se toman de los registros IAcP/IReP/IApP de status/P_imp que muestra
		 * el tablero del medidor porque su escala no es la misma en todos los
		 * equipos: verificado contra la medicion convertida de los 12 medidores,
		 * tres publican kW (83786132: 9504 contra 9507.7 calculados, 83786119:
		 * 2477 contra 2461.2, 83786124: 2415 contra 2379.0) y los otros nueve
		 * publican una escala 10000 veces mas chica. La cuenta, en cambio, cierra
		 * en los tres casos comprobables con menos del 2% de desvio.
		 *
		 * La reactiva viaja sin signo: sale de la raiz y el coseno que publica el
		 * equipo no dice si es inductiva o capacitiva.
		 */
		power: (meter, vi, factors) => {
			const fases = [0, 1, 2].map((n) => {
				const v = num(vi?.[`V_${n}`]?.value ?? null)
				const i = num(vi?.[`I_${n}`]?.value ?? null)
				const cos = num(vi?.[`CFi_${n}`]?.value ?? null)
				if ([v, i, cos].some((x) => x === null || isNaN(x))) return null
				const aparente = v * factors.v * i * factors.i
				const activa = aparente * cos
				return { s: aparente, p: activa, q: Math.sqrt(Math.max(aparente ** 2 - activa ** 2, 0)) }
			}).filter(Boolean)
			if (!fases.length) return { s: null, p: null, q: null }
			return {
				s: fases.reduce((acc, f) => acc + f.s, 0),
				p: fases.reduce((acc, f) => acc + f.p, 0),
				q: fases.reduce((acc, f) => acc + f.q, 0),
			}
		},
	},
	// Analizador de red
	3: {
		kind: 'analyzer',
		unit: 'V',
		units: { v: 'V', i: 'A', s: 'VA', p: 'W', q: 'VAr' },
		range: '-30m',
		fields: [
			'f_0_v', 'f_1_v', 'f_2_v',
			'f_0_i', 'f_1_i', 'f_2_i',
			'f_0_p', 'f_1_p', 'f_2_p',
			'f_0_q', 'f_1_q', 'f_2_q',
		],
		// Baja tension de fase (~228 V de una red 380/220): la compuesta se deriva
		voltage: (meter) => [0, 1, 2].map((n) => derivada(primerCampo(meter, `f_${n}_v`))),
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
			// Las potencias vienen en el mismo topic 'inst'
			power: [],
			// Mide directo, sin transformadores de medicion
			ratio: [],
		}),
		/*
		 * El analizador publica activa y reactiva por fase (f_n_p y f_n_q, en W y
		 * VAr: verificado contra Influx, 228.4 V por 14.7 A dan 3357 W contra
		 * f_0_p = 3316). Las tres potencias se arman con la misma cuenta que hace
		 * getMetrology para su tablero: activa y reactiva son la suma de las
		 * fases y la aparente es la suma de la raiz por fase.
		 */
		power: (meter) => {
			const fases = [0, 1, 2].map((n) => {
				const p = num(meter?.[`f_${n}_p`]?.value ?? null)
				const q = num(meter?.[`f_${n}_q`]?.value ?? null)
				if ([p, q].some((x) => x === null || isNaN(x))) return null
				return { s: Math.sqrt(p ** 2 + q ** 2), p, q }
			}).filter(Boolean)
			if (!fases.length) return { s: null, p: null, q: null }
			return {
				s: fases.reduce((acc, f) => acc + f.s, 0),
				p: fases.reduce((acc, f) => acc + f.p, 0),
				q: fases.reduce((acc, f) => acc + f.q, 0),
			}
		},
	},
}

const num = (v) => (v === null || v === undefined ? null : parseFloat(v))

/**
 * Tension de fase pasada a compuesta.
 */
const derivada = (fase) => (fase === null ? { value: null, derived: false } : { value: fase * RAIZ_3, derived: true })

/**
 * Primer campo con dato de la lista. Sirve para las magnitudes que cada marca
 * publica en un campo distinto (ver la tension del reconectador). Un 0 cuenta
 * como dato: es una medicion, no una ausencia.
 */
const primerCampo = (group, campos) => {
	for (const campo of Array.isArray(campos) ? campos : [campos]) {
		const valor = group?.[campo]?.value
		if (valor !== undefined && valor !== null) return num(valor)
	}
	return null
}

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
			const canales = family.topics(model, serial)
			CHANNELS.forEach((canal) => agregar(`${model.type}:${canal}`, canales[canal] || [], ref))
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
 * @returns {Promise<Object>} `{ states, meters, powers, ratios, overrides,
 * skipped }`, los cuatro primeros indexados por id de equipo.
 */
const fetchByEquipment = async (elements, influxName, db = null) => {
	const { byTopic, grupos, descartados } = buildTopicIndex(elements)

	// Un pedido por (familia, canal). Todos en paralelo: son independientes y el
	// total queda en el mas lento, no en la suma.
	const pedidos = [...grupos.entries()].map(([clave, topics]) => {
		const [type, canal] = clave.split(':')
		const family = FAMILIES[type]
		return {
			clave,
			canal,
			filas: lastByTopic(topics, channelFields(family, canal), influxName, channelRange(family, canal)),
		}
	})

	// Los overrides salen de MySQL y son independientes de Influx: van juntos
	const [resultados, overrides] = await Promise.all([Promise.all(pedidos.map((p) => p.filas)), manualRatios(db)])

	// Un indice por canal, porque no todas las familias publican todos
	const indices = { state: {}, meter: {}, power: {}, ratio: {} }
	pedidos.forEach((p, idx) => Object.assign(indices[p.canal], groupByEquipment(resultados[idx], byTopic)))

	return {
		states: indices.state,
		meters: indices.meter,
		powers: indices.power,
		ratios: indices.ratio,
		// Overrides manuales de CT/VT, que le ganan a lo que reporta el equipo
		overrides,
		skipped: descartados,
	}
}

/**
 * Los cuatro grupos de UN equipo, tal como los espera measuresOf.
 */
const groupsOf = (fetched, idEquipment) => ({
	meter: fetched.meters[idEquipment],
	power: fetched.powers[idEquipment],
	ratio: fetched.ratios[idEquipment],
})

/**
 * Mediciones de UN equipo, en las unidades en las que las publica.
 *
 * La tension y la corriente van POR FASE, como array de tres, para que el front
 * muestre L1/L2/L3 y no un promedio. La potencia va como las TRES POTENCIAS del
 * equipo entero — aparente, activa y reactiva —, que son las que muestra su
 * tablero: el reconectador no publica potencia por fase y las derivadas no eran
 * confiables (ver FAMILIES).
 *
 * En el medidor los valores vienen CONVERTIDOS por la relacion de
 * transformacion, igual que en su tablero: `manual` es el override activo de
 * MeterTransformRatios y, sin override, la relacion sale de lo que reporta el
 * equipo en status/Fasorial.
 *
 * `null` en un valor es "sin dato" y no cero: un 0 diria que el equipo no mide
 * nada, que es otra cosa.
 */
const measuresOf = (type, groups, manual = null) => {
	const family = FAMILIES[type]
	if (!family) return null
	const { meter, power, ratio } = groups ?? {}
	// El reconectador y el analizador miden directo; solo el medidor va por
	// transformadores de medicion y necesita conversion
	const factors = family.factors ? family.factors(ratio, manual) : { v: 1, i: 1, label: null }
	const escalar = (value, factor) => (value === null || isNaN(value) ? null : value * factor)
	const tension = family.voltage(meter)
	return {
		// { s, p, q }: aparente, activa y reactiva del equipo
		power: family.power(meter, power, factors),
		// Tension COMPUESTA, publicada donde el equipo la publica y derivada de la
		// fase donde no (ver RAIZ_3)
		v: tension.map(({ value }) => escalar(value, factors.v)),
		// Como se obtuvo, para que el front lo pueda aclarar
		vDerived: tension.some(({ derived }) => derived),
		i: family.i.map((campos) => escalar(primerCampo(meter, campos), factors.i)),
		units: family.units,
		// Relacion aplicada, para que el front la pueda aclarar; null si no se
		// convirtio nada
		tx: factors.label,
	}
}

module.exports = {
	FAMILIES,
	groupsOf,
	FIELDS_STATE,
	SAFE_TOPIC_PART,
	num,
	lastByTopic,
	buildTopicIndex,
	groupByEquipment,
	fetchByEquipment,
	measuresOf,
}
