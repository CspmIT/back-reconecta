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
	} catch (error) {
		throw error
	}
}

/**
 * Guarda o actualiza un reconectador en la base de datos.
 * @param {Object} dataRecloser - Contiene los datos del reconectador, incluyendo número de serie, marca, versión y configuración.
 * @returns {Promise<Object>} El reconectador guardado o actualizado.
 * @throws {Error} Si ocurre algún problema durante la transacción.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const updateRecloser = async (dataRecloser) => {
	try {
		const Recloser = await db.Recloser.update(dataRecloser, { where: { id: dataRecloser.id } })
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
		const recloser = await getAllRecloser()
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
	try {
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
const getMetrologiaIntantanea = async (data, influxName) => {
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
 * Consulta los datos instantaneos de un reconectador si no encuentra busca hasta 1 dia hacia atras, en InfluxDB.
 *
 * @param {Object} data - Un objeto que contiene la información del reconectador, incluyendo su marca y número de serie.
 * @returns {Promise<Object|null>} Un objeto que representa los datos encontrados en InfluxDB, o `null` si no se encuentran datos. Lanza un error si ocurre un problema en la consulta.
 * @throws {Error} Lanza un error si no se encuentran datos o si ocurre algún problema durante la consulta.
 * @author  [Jose Romani]  <jose.romani@hotmail.com>
 *
 */
const acRecloser = async (data, influxName) => {
	try {
		const query = `|> range(start: -30s, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_bin")
        |> filter(fn: (r) => r["_field"] == "ac" )
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`

		let dataInflux = await ConsultaInflux(query, influxName)

		if (!dataInflux || !dataInflux.length) {
			const fallbackQuery = `|> range(start: -1d, stop: now())
			|> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_bin")
			|> filter(fn: (r) => r["_field"] == "ac" )
			|> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
			|> last()`

			dataInflux = await ConsultaInflux(fallbackQuery, influxName)
		}
		if (!dataInflux || !dataInflux.length) return null
		let dataReturn = dataInflux[0]._value
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
const getListEvents = async (data, influxName) => {
	try {
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
const getTensionABC = async (data, influxName) => {
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
const getCorriente = async (data, influxName) => {
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
const getInterruption = async (data, influxName) => {
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
 * Consulta todo los envios de acciones sobre un reconectador en especifico
 *
 * @param {string} serial - El serial del reconectador específico para la consulta.
 * @returns {Promise<Object>} Un array de objetos que representa las acciones ejecutadas desde el tablero del SCADA.
 *
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getManauver = async (serial) => {
	try {
		let dataReturn = await db.RecloserSendMqtt.findAll({ where: { status: 1, serial: serial } })
		return dataReturn
	} catch (error) {
		throw new Error(error)
	}
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
	try {
		const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
		const baseQuery = `|> range(start: -3m, stop: now())
                        |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_bin")
                        |> filter(fn: (r) => r["_field"] == "${data.field}")
                        |> aggregateWindow(every: 1s, fn: last, createEmpty: false)`
		let status = false
		for (let attempt = 0; attempt < 11; attempt++) {
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
			if (attempt === 10) {
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
	} catch (error) {
		throw new Error(`Error: ${error.message}`)
	}
}

/**
 * Obtiene todas las ubicaciones del mapa con un estado activo (status = 1).
 *
 * @returns {Promise<Array>} Una promesa que resuelve en un array de ubicaciones activas del mapa.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getInfoMap = async () => {
	try {
		const dataMap = await db.MapLocation.findAll({ where: { status: 1 } })
		return dataMap
	} catch (error) {
		throw error
	}
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
	try {
		const query = ` |> range(start: 2022-11-01)
		 	|> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_events")
		 	|> sort(columns: ["_time"], desc: true)
		 	|> limit (n: 200)`

		let dataInflux = await ConsultaInflux(query, influxName)
		if (!dataInflux || dataInflux.length === 0) return []
		// throw new Error('No se encontraron datos en InfluxDB para el reconectador
		const packsEvents = {}
		for (const element of dataInflux) {
			const [name, event] = element._field.split('_')
			const timeGroup = (packsEvents[element._time] ||= {})
			timeGroup[event] ||= []
			timeGroup[event].push({
				field: element._field,
				value: element._value,
				time: element._time,
			})
		}

		return packsEvents
	} catch (error) {
		throw error
	}
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
	try {
		let packsEvents = await consultEventRecloserInfluxOld(data, influxName)
		const packsReturn = []

		for (const reg of Object.values(packsEvents)) {
			for (const item of Object.values(reg)) {
				const eventData = data.event.find((even) => even.id == item[0].value)
				if (eventData) {
					const dataPack =
						item[2]?.value > 1600000000000 && item[2]?.value < 1900000000000
							? new Date(item[2].value)
							: item[0].time
					const value = item[1]?.value >= 0 ? (item[1].value ? 'ON' : 'OFF') : ''

					packsReturn.push({
						event: `${eventData.name} - ${value}`,
						priority: eventData.priority,
						name: data.name,
						nro_recloser: data.number,
						typeDevice: data.typeDevice,
						id_device: data.id_device,
						id: item[0].value,
						dateAlert: dataPack,
						statusAlert: data.dateCheck >= dataPack ? 0 : 1,
						infoAdd: '-',
					})
				}
			}
		}

		return packsReturn
	} catch (error) {
		throw error
	}
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
	try {
		let packsEvents = await consultEventRecloserInfluxOld(data, influxName)
		const packsReturn = []
		for (const reg of Object.values(packsEvents)) {
			for (const item of Object.values(reg)) {
				const matchingEvent = data.event.find((even) => even.id == item[0].value)
				if (matchingEvent) {
					const dataPack =
						item[2]?.value > 1600000000000 && item[2]?.value < 1900000000000
							? new Date(item[2].value)
							: item[0].time
					const value = item[1]?.value >= 0 ? (item[1].value ? 'ON' : 'OFF') : ''

					packsReturn.push({
						event: `${matchingEvent.name} - ${value}`,
						id: item[0].value,
						dateAlert: dataPack,
						infoAdd: '-',
					})
				}
			}
		}

		return packsReturn
	} catch (error) {
		throw error
	}
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
	try {
		let packsEvents = await consultEventRecloserInfluxOld(data, influxName)
		let statusAlarm = false
		for (const reg of Object.values(packsEvents)) {
			for (const item of Object.values(reg)) {
				if (data.event.some((even) => even.id == item[0].value)) {
					statusAlarm = !data.event_date || new Date(item[0].time) > new Date(data.event_date)
					if (statusAlarm) break
				}
			}
			if (statusAlarm) break
		}
		return statusAlarm
	} catch (error) {
		throw error
	}
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
	acRecloser,
	getManauver,
}
