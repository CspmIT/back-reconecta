const { Op } = require('sequelize')
const { db } = require('../models')
const { ConsultaInflux } = require('./InfluxServices')

/**
 * Guarda o actualiza un reconectador en la base de datos.
 * @param {Object} dataRecloser - Contiene los datos del reconectador, incluyendo número de serie, marca, versión y configuración.
 * @returns {Promise<Object>} El reconectador guardado o actualizado.
 * @throws {Error} Si ocurre algún problema durante la transacción.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const saveRecloser = async (dataRecloser, transaction) => {
	try {
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
					status_recloser: dataRecloser.status_recloser || null,
					id_node: dataRecloser.id_node || null,
			  }
			: { ...dataRecloser }
		const [Recloser, created] = await db.Recloser.findOrCreate({
			where: { [Op.or]: [{ serial: data.serial }, { id: data.id }] },
			defaults: { ...data },
			transaction,
		})
		if (!created) {
			await Recloser.update(data, { transaction })
		}
		return Recloser
	} catch (error) {
		throw error
	}
}

/**
 * Guarda o actualiza un reconectador en la base de datos.
 * Si el reconectador con el número de serie especificado ya existe, se actualiza con los nuevos datos.
 * Si no existe, se crea un nuevo registro en la base de datos.
 *
 * @param {Object} dataRecloser - Un objeto que contiene los datos del reconectador, incluyendo número de serie, marca, versión y configuración.
 * @returns {Promise<Object>} El reconectador guardado o actualizado.
 * @throws {Error} Lanza un error si ocurre algún problema durante la transacción.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const saveNodeRecloser = async (dataRecloser, transaction) => {
	try {
		const Recloser = await db.Recloser.update(dataRecloser, {
			where: {
				id: dataRecloser.id,
			},
			transaction,
		})

		return Recloser
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene todos los reconectadores de la base de datos.
 *
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan todos los reconectadores encontrados, o lanza un error si no se encuentra ninguno.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const getAllRecloser = async () => {
	try {
		const RecloserDesarrollo = await db.Recloser.findAll({
			where: { status: 1 },
			include: {
				association: 'version',
				attributes: ['id', 'name'],
				include: {
					association: 'brand',
					attributes: ['id', 'name'],
				},
			},
		})
		return RecloserDesarrollo
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene todos los reconectadores de la base de datos.
 *
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan todos los reconectadores encontrados, o lanza un error si no se encuentra ninguno.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const getReclosersEnabled = async () => {
	try {
		const recloser = await db.Recloser.findAll({
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
		const result = recloser.filter((item) => {
			if (item.history.every((rel) => rel.status == 0) || item.history.length == 0) {
				return item
			}
		})
		return result
	} catch (error) {
		throw error
	}
}

/**
 * Busca un reconectador específico en la base de datos por su ID.
 *
 * @param {number} id - El ID del reconectador que se desea buscar.
 * @returns {Promise<Object|null>} Un objeto que representa el reconectador encontrado o lanza un error si no se encuentra.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const getRecloserId = async (id) => {
	try {
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
	} catch (error) {
		throw error
	}
}

/**
 * Busca un reconectador específico en la base de datos por su ID.
 *
 * @param {number} id - El ID del reconectador que se desea buscar.
 * @returns {Promise<Object|null>} Un objeto que representa el reconectador encontrado o lanza un error si no se encuentra.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const validateRecloser = async (id_recloser) => {
	try {
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
	} catch (error) {
		throw error
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
	try {
		if (!!typeRecloser) throw new Error('No se paso tipo de reconectador')
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
	} catch (error) {
		throw error
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
	try {
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
	} catch (error) {
		throw error
	}
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
const getMetrologiaIntantanea = async (data) => {
	try {
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
	} catch (error) {
		throw error
	}
}

/**
 * Consulta los eventos desde el 01/11/2022 hasta la fecha, filtrando los ultimos 200 registros, de un reconectador en InfluxDB.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Array<Array<Object>>>} Un array de arrays que representan los datos organizados encontrados en InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getListEvents = async (data) => {
	try {
		const query = `
			|> range(start: 2022-11-01)
            |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_events") 
            |> aggregateWindow(every: 250ms, fn: last, createEmpty: false)
            |> sort(columns: ["_time"], desc: true)
            |> limit(n: 200)
        `
		const dataInflux = await ConsultaInflux(query, influxName)
		console.log(query)
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
	} catch (error) {
		throw new Error('No se pudieron obtener los datos de InfluxDB.')
	}
}

/**
 * Consulta para Graficos de reconectador, para los últimos eventos en un período de 2 horas desde InfluxDB, filtrando los valores de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2) de un reconectador específico.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object>} Un objeto con claves que representan los diferentes campos de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2), y cada clave contiene un array de arrays con los valores de tiempo y tensión correspondientes.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getTensionABC = async (data) => {
	try {
		const query = `
			|> range(start: -2h)
            |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_ain") 
            |> filter(fn: (r) => r["_field"] == "V_L_ABC_0" or r["_field"] == "V_L_ABC_1" or r["_field"] == "V_L_ABC_2")
			|> aggregateWindow(every: 1s, fn: last, createEmpty: false)
        `
		const dataInflux = await ConsultaInflux(query, influxName)
		if (!dataInflux || dataInflux.length === 0) throw new Error('Sin datos en Influx')
		let dataReturn = {}
		for (const element of dataInflux) {
			if (!dataReturn[element._field]) {
				dataReturn[element._field] = []
			}

			dataReturn[element._field].push([element._time, element._value])
		}
		return dataReturn
	} catch (error) {
		throw new Error('No se pudieron obtener los datos de InfluxDB.')
	}
}

/**
 * Consulta para Graficos de reconectador, para los últimos eventos en un período de 2 horas desde InfluxDB, filtrando los valores de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2) de un reconectador específico.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object>} Un objeto con claves que representan los diferentes campos de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2), y cada clave contiene un array de arrays con los valores de tiempo y tensión correspondientes.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getCorriente = async (data) => {
	try {
		const query = `
			|> range(start: -2h)
            |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_ain") 
            |> filter(fn: (r) => r["_field"] == "I_f_0" or r["_field"] == "I_f_1" or r["_field"] == "I_f_2")
			|> aggregateWindow(every: 1s, fn: last, createEmpty: false)
        `
		const dataInflux = await ConsultaInflux(query, influxName)
		if (!dataInflux || dataInflux.length === 0) throw new Error('Sin datos en Influx')
		let dataReturn = {}
		for (const element of dataInflux) {
			if (!dataReturn[element._field]) {
				dataReturn[element._field] = []
			}

			dataReturn[element._field].push([element._time, element._value])
		}
		return dataReturn
	} catch (error) {
		throw new Error(error)
	}
}

/**
 * Consulta para Graficos de reconectador, para los últimos eventos en un período de 2 horas desde InfluxDB, filtrando los valores de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2) de un reconectador específico.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object>} Un objeto con claves que representan los diferentes campos de tensión (V_L_ABC_0, V_L_ABC_1, V_L_ABC_2), y cada clave contiene un array de arrays con los valores de tiempo y tensión correspondientes.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInterruption = async (data) => {
	try {
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
	} catch (error) {
		throw new Error(error)
	}
}

/**
 * Guarda o actualiza un reconectador en la base de datos.
 * Si el reconectador con el número de serie especificado ya existe, se actualiza con los nuevos datos.
 * Si no existe, se crea un nuevo registro en la base de datos.
 *
 * @param {Object} dataRecloser - Un objeto que contiene los datos del reconectador, incluyendo número de serie, marca, versión y configuración.
 * @returns {Promise<Object>} El reconectador guardado o actualizado.
 * @throws {Error} Lanza un error si ocurre algún problema durante la transacción.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getListVersions = async () => {
	try {
		const versions = await db.Brand.findAll({
			where: {
				status: 1,
			},
			attributes: ['id', 'name'],
			include: {
				association: 'version',
				attributes: ['id', 'name'],
			},
		})
		return versions
	} catch (error) {
		throw error
	}
}
module.exports = {
	getInterruption,
	getCorriente,
	getTensionABC,
	getListEvents,
	getMetrologiaIntantanea,
	saveRecloser,
	saveNodeRecloser,
	getAllRecloser,
	validateRecloser,
	getRecloserId,
	brandRecloser,
	dataRecloseInflux,
	getListVersions,
	getReclosersEnabled,
}
