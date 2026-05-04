const { Op } = require('sequelize')
const { ConsultaInflux } = require('./InfluxServices')
const { convertIsoToDate } = require('../utils/js/dateConvert')

/**
 * Guarda o actualiza un reconectador en la base de datos.
 * @param {Object} dataRecloser - Contiene los datos del reconectador, incluyendo número de serie, marca, versión y configuración.
 * @returns {Promise<Object>} El reconectador guardado o actualizado.
 * @throws {Error} Si ocurre algún problema durante la transacción.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const saveRecloser = async (db, dataRecloser, transaction) => {
	let idVersion = null
	if (dataRecloser.status) {
		idVersion = await db.Version.findOne({
			where: {
				name: dataRecloser.version,
			},
		})
	}
	const data = dataRecloser.status
		? {
				id: dataRecloser.id || 0,
				serial: dataRecloser.serial,
				status: dataRecloser.status,
				config: dataRecloser.config,
				id_version: idVersion.id,
				status_recloser: dataRecloser.status_recloser || 3,
				id_node: dataRecloser.id_node || null,
		  }
		: { ...dataRecloser }
	if (dataRecloser.id_user_create) {
		data.id_user_create = dataRecloser.id_user_create
	}
	if (dataRecloser.id_user_edit) {
		data.id_user_edit = dataRecloser.id_user_edit
	}

	const [Recloser, created] = await db.Recloser.findOrCreate({
		where: { [Op.or]: [{ serial: data.serial }, { id: data.id }] },
		defaults: { ...data },
		transaction,
	})
	if (!created) {
		await Recloser.update(data, { transaction })
	}
	return Recloser
}

/**
 * Guarda o actualiza un reconectador en la base de datos.
 * @param {Object} dataRecloser - Contiene los datos del reconectador, incluyendo número de serie, marca, versión y configuración.
 * @returns {Promise<Object>} El reconectador guardado o actualizado.
 * @throws {Error} Si ocurre algún problema durante la transacción.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const updateRecloser = async (db, dataRecloser) => {
	const Recloser = await db.Recloser.update(dataRecloser, { where: { id: dataRecloser.id } })
	return Recloser
}

/**
 * Obtiene todos los reconectadores de la base de datos.
 *
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan todos los reconectadores encontrados, o lanza un error si no se encuentra ninguno.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const getAllRecloser = async (db) => {
	const RecloserDesarrollo = await db.Recloser.findAll({
		where: { status: 1 },
		include: [
			{
				association: 'version',
				attributes: ['id', 'name'],
				include: {
					association: 'brand',
					attributes: ['id', 'name'],
				},
			},
			{
				association: 'history',
			},
		],
	})
	return RecloserDesarrollo
}

/**
 * Obtiene todos los reconectadores de la base de datos.
 *
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan todos los reconectadores encontrados, o lanza un error si no se encuentra ninguno.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const getReclosersEnabled = async () => {
	const recloser = await getAllRecloser()
	const result = recloser.filter((item) => {
		if (item.history.every((rel) => rel.status == 1) || item.history.length == 1) {
			return item
		}
	})
	return result
}

/**
 * Busca un reconectador específico en la base de datos por su ID.
 *
 * @param {number} id - El ID del reconectador que se desea buscar.
 * @returns {Promise<Object|null>} Un objeto que representa el reconectador encontrado o lanza un error si no se encuentra.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const getRecloserId = async (db, id) => {
	const Recloser = await db.Recloser.findOne({
		where: { id: id },
		include: [
			{
				association: 'version',
				include: [
					{
						association: 'brand',
					},
				],
			},
		],
	})
	if (!Recloser) throw new Error('No existe ningun reconectador')
	return Recloser
}

/**
 * Busca un reconectador específico en la base de datos por su ID.
 *
 * @param {number} id - El ID del reconectador que se desea buscar.
 * @returns {Promise<Object|null>} Un objeto que representa el reconectador encontrado o lanza un error si no se encuentra.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const validateRecloser = async (db, id_recloser) => {
	const relationnode = await db.Node_History.findOne({
		where: [
			{
				id_device: id_recloser,
			},
			{
				status: 1,
			},
			{
				type_device: 1,
			},
		],
	})
	if (relationnode === null) {
		return false
	} else {
		return 'El reconectador ya esta relacionada a otro Nodo'
	}
}

/**
 * Obtencion de nombre de la marca segun el tipo.
 *
 * @param {Object} typeRecloser - Una variable que contiene un numero con el tipo de reconectador [ 0- NOJA, 1- COOPER, 2- ABM].
 * @returns {Promise<Object|null>} Un string que representa el nombre de marca, en caso contrario devuelve un string vacio.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const brandRecloser = async (typeRecloser) => {
	if (!typeRecloser) {
		throw new Error('No se pasó tipo de reconectador')
	}
	switch (typeRecloser) {
		case 0:
			return 'NOJA'
		case 1:
			return 'COOPER'
		case 2:
			return 'ABM'
		default:
			return ''
	}
}

/**
 * Consulta el estado más reciente de un reconectador específico en InfluxDB.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object|null>} Un objeto que representa los datos encontrados en InfluxDB, o lanza un error si no se encuentra ningún dato.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const dataRecloseInflux = async (data, influxName) => {
	const query = `|> range(start: -3m, stop: now())
        |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_bin")
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`
	const dataInflux = await ConsultaInflux(query, influxName)
	if (!dataInflux) throw new Error('No existe ningun reconectador')
	let dataReturn = {}
	for (const element of dataInflux) {
		// Si aún no existe un array para este campo (_field), lo inicializa
		if (!dataReturn[element._field]) {
			dataReturn[element._field] = []
		}
		// Agrega el elemento al array correspondiente
		dataReturn[element._field].push({
			field: element._field,
			value: element._value,
			time: element._time,
		})
	}
	return dataReturn
}

/**
 * Consulta el estado instantáneo de un reconectador en InfluxDB, buscando hasta 3 minutos hacia atrás.
 * Si no encuentra datos recientes, lanza un error.
 *
 * @param {Object} data - Un objeto con la información del reconectador, incluyendo su marca y número de serie.
 * @param {string} influxName - El nombre de la base de datos en InfluxDB donde se realiza la consulta.
 * @returns {Promise<number>} El estado del reconectador, donde:
 *  0 = Cerrado,
 *  1 = Abierto,
 *  2 = Sin Conexion,
 *  3 = Falla
 * @throws {Error} Lanza un error si no se encuentran datos en InfluxDB o si ocurre algún problema durante la consulta.
 * @author  [Jose Romani]  <jose.romani@hotmail.com>
 */
const getStatusRecloser = async (data, influxName) => {
	const query = `|> range(start: -3m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_bin")
        |> filter(fn: (r) => r["_field"] == "ac" or r["_field"] == "d/c")
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`

	let dataInflux = await ConsultaInflux(query, influxName)
	if (!dataInflux || dataInflux.length === 0) return 3
	const dataReturn = new Map()

	dataInflux.forEach((element) => {
		if (!dataReturn.has(element._field)) {
			dataReturn.set(element._field, [])
		}
		dataReturn.get(element._field).push({
			field: element._field,
			value: element._value,
			time: element._time,
		})
	})

	const acValue = dataReturn.get('ac')?.[0]?.value
	const dcValue = dataReturn.get('d/c')?.[0]?.value

	if (acValue === undefined || dcValue === undefined) {
		return 3
	}
	if (acValue === 1 && dcValue === 1) {
		return 0 // Cerrado
	} else if ((acValue === 1 && dcValue === 0) || (acValue === 0 && dcValue === 0)) {
		return 1 // Abierto
	} else if (acValue === 0 && dcValue === 1) {
		return 2 // Cerrado sin tensión
	}
	return 3 // Sin Señal
}

/**
 * Consulta los datos instantaneos de un reconectador si no encuentra busca hasta 1 dia hacia atras, en InfluxDB.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object|null>} Un objeto que representa los datos encontrados en InfluxDB, o `null` si no se encuentran datos. Lanza un error si ocurre un problema en la consulta.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author  [Jose Romani]  <jose.romani@hotmail.com>
 *
 */
const getMetrologiaIntantanea = async (data, influxName) => {
	const query = `|> range(start: -30s, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_ain" or r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_ain_2")
        |> filter(fn: (r) => r["_field"] == "I_f_0" or r["_field"] == "bat_0" or r["_field"] == "bat_1" or r["_field"] == "bat_2" or r["_field"] == "I_f_1" or r["_field"] == "I_f_2" or r["_field"] == "I_n" or r["_field"] == "V_f_ABC_0" or r["_field"] == "V_f_ABC_1" or r["_field"] == "V_f_ABC_2" or r["_field"] == "V_L_ABC_0" or r["_field"] == "V_L_ABC_1" or r["_field"] == "V_L_ABC_2" or r["_field"] == "F_ABC" or r["_field"] == "V_L_SRT_0" or r["_field"] == "V_L_SRT_1" or r["_field"] == "V_L_SRT_2" or r["_field"] == "V_f_SRT_0" or r["_field"] == "V_f_SRT_1" or r["_field"] == "V_f_SRT_2" or r["_field"] == "W_0" or r["_field"] == "W_1" or r["_field"] == "W_2" or r["_field"] == "FP_f_0" or r["_field"] == "FP_f_1" or r["_field"] == "FP_f_2")
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`

	let dataInflux = await ConsultaInflux(query, influxName)

	if (!dataInflux) {
		const fallbackQuery = `|> range(start: -1d, stop: now())
			|> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_ain" or r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_ain_2")
			|> filter(fn: (r) => r["_field"] == "I_f_0" or r["_field"] == "I_f_1" or r["_field"] == "I_f_2" or r["_field"] == "I_n" or r["_field"] == "V_f_ABC_0" or r["_field"] == "V_f_ABC_1" or r["_field"] == "V_f_ABC_2" or r["_field"] == "V_L_ABC_0" or r["_field"] == "V_L_ABC_1" or r["_field"] == "V_L_ABC_2" or r["_field"] == "F_ABC" or r["_field"] == "V_L_SRT_0" or r["_field"] == "V_L_SRT_1" or r["_field"] == "V_L_SRT_2" or r["_field"] == "V_f_SRT_0" or r["_field"] == "V_f_SRT_1" or r["_field"] == "V_f_SRT_2" or r["_field"] == "W_0" or r["_field"] == "W_1" or r["_field"] == "W_2" or r["_field"] == "FP_f_0" or r["_field"] == "FP_f_1" or r["_field"] == "FP_f_2")
			|> aggregateWindow(every: 1m, fn: last, createEmpty: false)
			|> last()`

		dataInflux = await ConsultaInflux(fallbackQuery, influxName)
	}
	if (!dataInflux) throw new Error('Sin datos en Influx')
	let dataReturn = {}
	for (const element of dataInflux) {
		if (!dataReturn[element._field]) {
			dataReturn[element._field] = []
		}
		dataReturn[element._field].push({
			field: element._field,
			value: element._value,
			time: element._time,
		})
	}
	return dataReturn
}

/**
 * Consulta los datos instantaneos de un reconectador si no encuentra busca hasta 1 dia hacia atras, en InfluxDB.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object|null>} Un objeto que representa los datos encontrados en InfluxDB, o `null` si no se encuentran datos. Lanza un error si ocurre un problema en la consulta.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author  [Jose Romani]  <jose.romani@hotmail.com>
 *
 */

const acReclosers = async (filter, influxName) => {
	const query = `|> range(start: -1m, stop: now())
		|> filter(fn: (r) => r["topic"] == ${filter})
        |> filter(fn: (r) => r["_field"] == "ac" )
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`

	let dataInflux = await ConsultaInflux(query, influxName)

	if (!dataInflux || !dataInflux.length) {
		const fallbackQuery = `|> range(start: -1d, stop: now())
			|> filter(fn: (r) => r["topic"] == ${filter})
			|> filter(fn: (r) => r["_field"] == "ac" )
			|> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
			|> last()`

		dataInflux = await ConsultaInflux(fallbackQuery, influxName)
	}
	if (!dataInflux || !dataInflux.length) return null
	return dataInflux
}

/**
 * Consulta los eventos desde el 01/11/2022 hasta la fecha, filtrando los ultimos 200 registros, de un reconectador en InfluxDB.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Array<Array<Object>>>} Un array de arrays que representan los datos organizados encontrados en InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getListEvents = async (data, influxName) => {
	const query = `
			|> range(start: 2022-11-01)
            |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_events") 
            |> aggregateWindow(every: 250ms, fn: last, createEmpty: false)
            |> sort(columns: ["_time"], desc: true)
            |> limit(n: 200)
        `
	const dataInflux = await ConsultaInflux(query, influxName)
	if (!dataInflux || dataInflux.length === 0) throw new Error('Sin datos en Influx')

	let organizedData = []
	let groupedRecords = {}

	dataInflux.forEach((record) => {
		const timeKey = record._time
		if (!groupedRecords[timeKey]) {
			groupedRecords[timeKey] = []
		}
		groupedRecords[timeKey].push({
			value: record._value,
			time: timeKey,
			field: record._field,
		})
	})
	Object.keys(groupedRecords).forEach((timeKey) => {
		const recordsGroup = groupedRecords[timeKey]
		for (let i = 0; i < recordsGroup.length; i += 3) {
			let records = {
				variable: recordsGroup.slice(i, i + 3).filter((item) => item.field.slice(-1) == '0')[0],
				event: recordsGroup.slice(i, i + 3).filter((item) => item.field.slice(-1) == '1')[0],
				time: recordsGroup.slice(i, i + 3).filter((item) => item.field.slice(-1) == '2')[0],
			}
			organizedData.push(records)
		}
	})

	return organizedData
}

/**
 * Consulta para Graficos de reconectador, para los últimos eventos en un período de 2 horas desde InfluxDB, filtrando los valores de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2) de un reconectador específico.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object>} Un objeto con claves que representan los diferentes campos de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2), y cada clave contiene un array de arrays con los valores de tiempo y tensión correspondientes.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getTensionABC = async (data, influxName) => {
	const query = `
			|> range(start: ${data.dateStart}, stop: ${data.dateFinished})
            |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_ain") 
            |> filter(fn: (r) => r["_field"] == "V_L_ABC_0" or r["_field"] == "V_L_ABC_1" or r["_field"] == "V_L_ABC_2")
			|> aggregateWindow(every: 1m, fn: last, createEmpty: false)
        `
	const dataInflux = await ConsultaInflux(query, influxName)
	if (!dataInflux || dataInflux.length === 0) throw new Error('Sin datos en Influx')
	let dataReturn = {}
	for (const element of dataInflux) {
		if (!dataReturn[element._field]) {
			dataReturn[element._field] = { name: element._field, values: [], time: [] }
		}

		dataReturn[element._field].values.push(element._value)
		const timeConvert = await convertIsoToDate(element._time)
		dataReturn[element._field].time.push(timeConvert)
	}
	return dataReturn
}

/**
 * Consulta para Graficos de reconectador, para los últimos eventos en un período de 2 horas desde InfluxDB, filtrando los valores de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2) de un reconectador específico.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object>} Un objeto con claves que representan los diferentes campos de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2), y cada clave contiene un array de arrays con los valores de tiempo y tensión correspondientes.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getCorriente = async (data, influxName) => {
	const query = `
			|> range(start: ${data.dateStart}, stop: ${data.dateFinished})
            |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_ain") 
            |> filter(fn: (r) => r["_field"] == "I_f_0" or r["_field"] == "I_f_1" or r["_field"] == "I_f_2")
			|> aggregateWindow(every: 1m, fn: last, createEmpty: false)
        `
	const dataInflux = await ConsultaInflux(query, influxName)
	if (!dataInflux || dataInflux.length === 0) throw new Error('Sin datos en Influx')
	let dataReturn = {}
	for (const element of dataInflux) {
		if (!dataReturn[element._field]) {
			dataReturn[element._field] = { name: element._field, values: [], time: [] }
		}

		dataReturn[element._field].values.push(element._value)
		const timeConvert = await convertIsoToDate(element._time)
		dataReturn[element._field].time.push(timeConvert)
	}
	return dataReturn
}

/**
 * Consulta para Graficos de reconectador, para los últimos eventos en un período de 2 horas desde InfluxDB, filtrando los valores de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2) de un reconectador específico.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object>} Un objeto con claves que representan los diferentes campos de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2), y cada clave contiene un array de arrays con los valores de tiempo y tensión correspondientes.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInterruption = async (data, influxName) => {
	const query = `
			|> range(start: -2h)
            |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_ain_2") 
			|> filter(fn: (r) => r["_field"] == "Int_ABC_0" or r["_field"] == "Int_ABC_1" or r["_field"] == "Int_ABC_2" or r["_field"] == "Int_ABC_3" or r["_field"] == "Int_SRT_0" or r["_field"] == "Int_SRT_1" or r["_field"] == "Int_SRT_2" or r["_field"] == "Int_SRT_3")
			|> aggregateWindow(every: 1s, fn: last, createEmpty: false)
			|> sort(columns: ["_time"], desc: false)
			|>limit(n: 1)
        `
	const dataInflux = await ConsultaInflux(query, influxName)
	if (!dataInflux || dataInflux.length === 0) throw new Error('Sin datos en Influx')
	let dataReturn = {}
	for (const element of dataInflux) {
		if (!dataReturn[element._field]) {
			dataReturn[element._field] = ''
		}

		dataReturn[element._field] = element._value
	}
	return dataReturn
}

/**
 * Consulta todo los envios de acciones sobre un reconectador en especifico
 *
 * @param {string} serial - El serial del reconectador específico para la consulta.
 * @returns {Promise<Object>} Un array de objetos que representa las acciones ejecutadas desde el tablero del SCADA.
 *
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getManauver = async (db, serial) => {
	let dataReturn = await db.RecloserSendMqtt.findAll({
		include: [
			{
				association: 'user_create',
			},
		],
		where: { status: 1, serial: serial },
	})
	return dataReturn
}

/**
 * Controla cambios en el estado de un reconectador consultando los últimos eventos en InfluxDB.
 * Realiza una consulta para verificar si un comando fue ejecutado correctamente, buscando un valor específico en el campo de datos de un reconectador en un período de 3 minutos.
 * Si el comando no se ejecuta correctamente, intenta verificar un campo de reconocimiento ('c/d_ack').
 *
 * @param {Object} data - Un objeto con la información del reconectador, incluyendo la marca, número de serie, campo a consultar y acción esperada.
 * @param {string} influxName - El nombre de la base de datos de InfluxDB donde se realizará la consulta.
 * @returns {Promise<boolean>} - Retorna un valor booleano que indica si el reconectador ejecutó el comando correctamente.
 * @throws {Error} Lanza un error si no se encuentran datos en la base de datos o si el reconectador no ejecuta el comando.
 * @author José Romani <jose.romani@hotmail.com>
 */
const controlChange = async (data, influxName) => {
	const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
	const baseQuery = `|> range(start: -3m, stop: now())
                        |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_bin")
                        |> filter(fn: (r) => r["_field"] == "${data.field}")
                        |> aggregateWindow(every: 1s, fn: last, createEmpty: false)`
	let status = false
	for (let attempt = 0; attempt < 20; attempt++) {
		const dataInflux = await ConsultaInflux(baseQuery, influxName)

		if (!dataInflux || dataInflux.length === 0) {
			throw new Error('No se encontró valor en la base de datos.')
		}

		for (const element of dataInflux) {
			if (element._value == data.action) {
				status = true
				break
			}
		}
		if (attempt === 20) {
			if (data.field === 'd/c') {
				const queryDC = `|> range(start: -1m, stop: now())
                        |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_bin")
                        |> filter(fn: (r) => r["_field"] == "c/d_ack")
                        |> aggregateWindow(every: 1s, fn: last, createEmpty: false)`

				const newDataInflux2 = await ConsultaInflux(queryDC, influxName)

				if (!newDataInflux2 || newDataInflux2.length === 0) {
					throw new Error('No se encontró valor en la base de datos.')
				}

				for (const element of newDataInflux2) {
					if (element._value == data.action) {
						throw new Error('El reconectador no ejecutó el comando.')
					}
				}
			} else {
				throw new Error('El reconectador no ejecutó el comando.')
			}
		}

		// Esperar 1 segundo antes del próximo intento
		await sleep(1000)
	}

	return status
}

/**
 * Obtiene todas las ubicaciones del mapa con un estado activo (status = 1).
 *
 * @returns {Promise<Array>} Una promesa que resuelve en un array de ubicaciones activas del mapa.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getInfoMap = async (db) => {
	const dataMap = await db.MapLocation.findAll({ where: { status: 1 } })
	return dataMap
}

/**
 * Consulta eventos históricos de un reconectador en InfluxDB, desde el 2022-11-01 hasta el presente.
 * Si no encuentra datos recientes, lanza un error.
 *
 * @param {Object} data - Información del reconectador, que incluye marca y número de serie.
 * @param {string} influxName - Nombre de la base de datos en InfluxDB donde se realiza la consulta.
 * @returns {Promise<Object>} Un objeto con el estado de eventos organizados por tiempos y eventos, donde cada clave de tiempo contiene un array de objetos con:
 *  - field: nombre del campo del evento,
 *  - value: valor del evento,
 *  - time: timestamp del evento.
 *  Retorna un array vacío si no se encuentran datos recientes
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author  [Jose Romani]  <jose.romani@hotmail.com>
 */
const consultEventRecloserInfluxOld = async (data, influxName) => {
	const query = ` |> range(start: 2022-11-01)
		 	|> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_events")
		 	|> sort(columns: ["_time"], desc: true)
		 	|> limit (n: 200)`

	let dataInflux = await ConsultaInflux(query, influxName)
	if (!dataInflux || dataInflux.length === 0) return []
	// throw new Error('No se encontraron datos en InfluxDB para el reconectador
	const packsEvents = {}
	for (const element of dataInflux) {
		if (!packsEvents[element._time]) {
			packsEvents[element._time] = {}
		}
		const timeGroup = packsEvents[element._time]
		timeGroup.time = element._time
		switch (element._field) {
			case 'events_0':
				timeGroup.id = element._value
				break
			case 'events_1':
				timeGroup.unixtime = element._value
				break
			case 'info':
				timeGroup.info = element._value
				break
			default:
				timeGroup.status = 0
				break
		}
	}

	return packsEvents
}
/**
 * Verifica el estado de eventos específicos de un reconectador consultado en InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo marca, número de serie, y eventos a evaluar.
 * @param {string} influxName - Nombre de la base de datos en InfluxDB donde se realiza la consulta.
 * @returns {Promise<Array>} Un arreglo de objetos con el estado de los eventos, cada uno contiene:
 *  - event: nombre y estado ('ON'/'OFF') del evento,
 *  - priority: prioridad del evento,
 *  - name: nombre del dispositivo,
 *  - nro_recloser: número del reconectador,
 *  - typeDevice: tipo de dispositivo,
 *  - id_device: identificador del dispositivo,
 *  - id: identificador del evento,
 *  - dateAlert: fecha del evento o paquete,
 *  - statusAlert: estado de alerta (0 = sin alerta, 1 = alerta),
 *  - infoAdd: información adicional.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta o el procesamiento de los datos.
 * @author
 */
const getEventCheckRecloserOld = async (data, influxName) => {
	let packsEvents = await consultEventRecloserInfluxOld(data, influxName)
	const packsReturn = []
	for (const reg of Object.values(packsEvents)) {
		const eventData = data.event.find((even) => even.id == reg?.id)
		if (eventData) {
			const nojaSuma = data.brand === 'NOJA' ? 3 * 60 * 60 * 1000 : 0 // a los noja hay que sumarle 3 horas
			const dataPack =
				reg?.unixtime > 1600000000000 && reg?.unixtime < 1900000000000
					? new Date(reg.unixtime + nojaSuma) // Sumar 3 horas
					: new Date(new Date(reg.time).getTime() + nojaSuma)
			if (!dataPack) continue
			const newdate = new Date(data.dateCheck).setHours(new Date(data.dateCheck).getHours())
			//const dateEvent = new Date(dataPack).setHours(new Date(dataPack).getHours())
			const dateInflux = new Date(reg?.time).setHours(new Date(reg?.time).getHours())
			if (reg?.id === 257 && reg?.info) {
				//extrar la hora que me trae en unix y convertirla
				const unixValue = Number(reg.info.replace(' ms', ''))
				const dateConverted = new Date(unixValue)
				reg.info = await convertIsoToDate(dateConverted.toISOString())
			}
			const statusAlarm = newdate >= dateInflux ? 0 : 1
			packsReturn.push({
				event: `${eventData.name}`,
				priority: eventData.priority,
				description: eventData.description,
				name: data.name,
				observation: data.observation,
				nro_recloser: data.number,
				typeDevice: data.typeDevice,
				id_device: data.id_device,
				id: reg?.id,
				dateAlert: dataPack,
				dateEvent: data.dateCheck,
				statusAlert: statusAlarm,
				infoAdd: reg?.info,
			})
		}
	}

	return packsReturn
}
/**
 * Consulta eventos históricos de un reconectador en InfluxDB, desde el 2022-11-01 hasta el presente.
 * Si no encuentra datos recientes, lanza un error.
 *
 * @param {Object} data - Información del reconectador, incluyendo marca, número de serie y eventos a evaluar.
 * @param {string} influxName - Nombre de la base de datos en InfluxDB donde se realiza la consulta.
 * @returns {Promise<Array>} Un arreglo de objetos que representan los eventos del reconectador, cada uno contiene:
 *  - event: nombre del evento y estado ('ON'/'OFF'),
 *  - id: identificador del evento,
 *  - dateAlert: fecha del evento o paquete,
 *  - infoAdd: información adicional.
 * @throws {Error} Lanza un error si no se encuentran datos en InfluxDB o si ocurre algún problema durante la consulta.
 * @author  [Jose Romani]  <jose.romani@hotmail.com>
 */

const getEventRecloserOld = async (data, influxName) => {
	let packsEvents = await consultEventRecloserInfluxOld(data, influxName)
	const packsReturn = []
	for (const reg of Object.values(packsEvents)) {
		const matchingEvent = data.event.find((even) => even.id_influx == reg?.id)
		if (matchingEvent) {
			const nojaSuma = data.brand === 'NOJA' ? 3 * 60 * 60 * 1000 : 0
			const dataPack =
				reg?.unixtime > 1600000000000 && reg?.unixtime < 1900000000000
					? new Date(reg.unixtime + nojaSuma) // Sumar 3 horas
					: new Date(new Date(reg.time).getTime() + nojaSuma)
			if (!dataPack) continue
			if (reg?.id === 257 && reg?.info) {
				//extrar la hora que me trae en unix y convertirla
				const unixValue = Number(reg.info.replace(' ms', ''))
				const dateConverted = new Date(unixValue)
				reg.info = await convertIsoToDate(dateConverted.toISOString())
			}
			packsReturn.push({
				event: `${matchingEvent.name}`,
				eventId: matchingEvent.id,
				id: reg?.id,
				dateAlert: dataPack,
				priority: matchingEvent.priority,
				type_var: matchingEvent.type_var,
				infoAdd: reg?.info,
				custom: matchingEvent.custom,
				idFile: matchingEvent.id_file ?? '-',
			})
		}
	}

	return packsReturn
}

/**
 * Consulta el estado instantáneo de un reconectador en InfluxDB, buscando desde 2022-11-01 hasta ahora.
 * Si no encuentra datos recientes, lanza un error.
 *
 * @param {Object} data - Información del reconectador, incluyendo su marca, número de serie y eventos a evaluar.
 * @param {string} influxName - Nombre de la base de datos en InfluxDB donde se realiza la consulta.
 * @returns {Promise<boolean>} El estado de alarma del reconectador:
 *  - true = Alarma activada
 *  - false = Sin alarma
 * @throws {Error} Lanza un error si no se encuentran datos en InfluxDB o si ocurre algún problema durante la consulta.
 * @author  [Jose Romani]  <jose.romani@hotmail.com>
 */

const getStatusAlarm = async (data, influxName) => {
	let packsEvents = await consultEventRecloserInfluxOld(data, influxName)
	let statusAlarm = false
	for (const reg of Object.values(packsEvents)) {
		if (data.event.some((even) => even.id == reg?.id)) {
			statusAlarm = !data.event_date || new Date(reg?.time) > new Date(data.event_date)
			if (statusAlarm) break
		}
		if (statusAlarm) break
	}
	return statusAlarm
}

const getReclosersxVersion = async (db, id_version) => {
	const recloser = await db.Recloser.findAll({
		where: { id_version: id_version },
		include: [
			{
				association: 'version',
				include: [
					{
						association: 'brand',
					},
				],
			},
		],
	})
	return recloser
}
module.exports = {
	getInterruption,
	getCorriente,
	getStatusRecloser,
	getTensionABC,
	getListEvents,
	getMetrologiaIntantanea,
	saveRecloser,
	getAllRecloser,
	validateRecloser,
	getRecloserId,
	brandRecloser,
	dataRecloseInflux,
	controlChange,
	getReclosersEnabled,
	getInfoMap,
	consultEventRecloserInfluxOld,
	getEventRecloserOld,
	getEventCheckRecloserOld,
	getStatusAlarm,
	updateRecloser,
	acReclosers,
	getManauver,
	getReclosersxVersion,
}
