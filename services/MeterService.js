const { db } = require('../models')
const { ConsultaInflux } = require('./InfluxServices')

/**
 * Obtiene una lista de medidores eléctricos con su información relacionada.
 *
 * @returns {Promise<Array>} Devuelve un arreglo con los registros de medidores eléctricos y sus asociaciones.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta a la base de datos.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getList = async () => {
	try {
		const MeterElectricity = await db.MeterElectricity.findAll({
			where: {
				status: 1,
			},
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
					required: false,
					where: {
						type_device: 2,
					},
				},
			],
		})
		return MeterElectricity
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene información detallada de un medidor eléctrico basado en su ID.
 *
 * @param {number} id - El ID del medidor eléctrico.
 * @returns {Promise<Object>} Devuelve un objeto con los datos del medidor eléctrico.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getxID = async (id) => {
	try {
		const MeterElectricity = await db.MeterElectricity.findOne({
			where: {
				status: 1,
				id: id,
			},
			attributes: { exclude: ['createdAt', 'updatedAt'] },
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
					required: false,
					attributes: { exclude: ['createdAt', 'updatedAt'] },
					where: { type_device: 2 },
					include: {
						association: 'nodes',
						attributes: { exclude: ['createdAt', 'updatedAt'] },
					},
				},
			],
		})
		return MeterElectricity
	} catch (error) {
		throw error
	}
}

/**
 * Consulta el estado de un dispositivo en InfluxDB y lo valida.
 *
 * @param {Object} data - Datos del dispositivo que incluyen marca, versión y número de serie.
 * @param {string} influxName - Nombre de la base de datos en InfluxDB.
 * @returns {Promise<number>} Devuelve `1` si está cerrado, `2` si está abierto.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta o el procesamiento de los datos.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getStatus = async (data, influxName) => {
	try {
		const query = `|> range(start: -30m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI")
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`

		let dataInflux = await ConsultaInflux(query, influxName)
		if (!dataInflux || dataInflux.length === 0) return 2
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

		const v_0Value = dataReturn.get('V_0')?.[0]?.value

		return v_0Value === undefined || !v_0Value ? 2 : 1
	} catch (error) {
		throw error
	}
}

/**
 * Valida si un número de serie está disponible para su uso.
 *
 * @param {string} serial - Número de serie del dispositivo.
 * @param {number} id_version - ID de la versión del dispositivo.
 * @param {number} id - ID del dispositivo actual para evitar conflictos.
 * @returns {Promise<string|boolean>} Devuelve un mensaje si no está disponible o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const validateEnable = async (serial, id_version, id) => {
	try {
		const MeterElectricity = await db.MeterElectricity.findOne({
			where: {
				serial: serial,
				id_version: id_version,
			},
		})
		if (!MeterElectricity) {
			return false
		}
		return MeterElectricity.id !== id ? 'El número de serie no está disponible' : false
	} catch (error) {
		throw error
	}
}

/**
 * Guarda o actualiza un registro de medidor eléctrico en la base de datos.
 *
 * @param {Object} data - Datos del medidor eléctrico.
 * @param {Object} transaction - Transacción activa de Sequelize.
 * @returns {Promise<Object>} Devuelve el registro guardado o actualizado.
 * @throws {Error} Lanza un error si ocurre algún problema durante el guardado o la actualización.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const save = async (data, transaction) => {
	try {
		const [MeterElectricity, created] = await db.MeterElectricity.findOrCreate({
			where: [{ serial: data.serial, id_version: data.id_version }],
			defaults: { ...data },
			transaction,
		})
		if (!created) {
			await MeterElectricity.update(data, { transaction })
		}
		return MeterElectricity
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene una lista de dispositivos habilitados según el historial de sus relaciones.
 *
 * @returns {Promise<Object[]>} Devuelve una lista de dispositivos habilitados.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getEnabled = async (data, transaction) => {
	try {
		const meters = await getList()
		const result = meters.filter(
			(item) => item.history.every((rel) => rel.status === 0) || item.history.length === 0
		)
		return result
	} catch (error) {
		throw error
	}
}

/**
 * Consulta metrología básica desde InfluxDB.
 *
 * @param {Object} data - Contiene marca, versión y número de serie del medidor.
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object>} Un objeto con los datos procesados de InfluxDB.
 * @throws Error en caso de fallo durante la consulta o procesamiento.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 */
const getMetrologyBasic = async (data, influxName) => {
	try {
		const query = `|> range(start: -1h, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Res")
		|> last()`
		const maxMensual = `|> range(start: -2mo, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/historical/Table_6")
		 |> filter(fn: (r) => r["_field"] == "RMS_Max_0" or r["_field"] == "RMS_Max_2" or r["_field"] == "RMS_Max_4" or r["_field"] == "RMS_Max_6" or r["_field"] == "RMS_Max_8" or r["_field"] == "RMS_Max_10")
		|> max()`
		const maxHistorico = `|> range(start: 2022-03-01, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/historical/Table_6")
		 |> filter(fn: (r) => r["_field"] == "RMS_Max_0" or r["_field"] == "RMS_Max_2" or r["_field"] == "RMS_Max_4" or r["_field"] == "RMS_Max_6" or r["_field"] == "RMS_Max_8" or r["_field"] == "RMS_Max_10")
		|> max()`

		const [result1, result2, result3, result4] = await Promise.all([
			ConsultaInflux(query, influxName),
			ConsultaInflux(maxMensual, influxName),
			ConsultaInflux(maxHistorico, influxName),
		])
		const dataReturn = {
			VI: await processInfluxData(result1),
			maxMonth: await processInfluxData(result2),
			maxHistory: await processInfluxData(result3),
		}
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Consulta metrología energética desde InfluxDB.
 *
 * @param {Object} data - Contiene marca, versión y número de serie del medidor.
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object>} Datos procesados del medidor en InfluxDB.
 * @throws Error si ocurre algún fallo en la consulta o procesamiento.
 * @author [Jose Romani] <jose.romani@hotmail.com>
 */
const getMetrologyEnergy = async (data, influxName) => {
	try {
		const query = `|> range(start: -30m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/E_exp" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/E_imp" )
		|> last()`
		const result = await ConsultaInflux(query, influxName)
		return await processInfluxData(result)
	} catch (error) {
		throw error
	}
}

/**
 * Consulta metrología de potencia desde InfluxDB.
 *
 * @param {Object} data - Contiene marca, versión y número de serie del medidor.
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object>} Datos procesados del medidor en InfluxDB.
 * @throws Error si ocurre algún fallo en la consulta o procesamiento.
 * @author [Jose Romani] <jose.romani@hotmail.com>
 */
const getMetrologyPower = async (data, influxName) => {
	try {
		const query = `|> range(start: -30m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/P_exp" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/P_imp" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI" )
		|> last()`
		const result = await ConsultaInflux(query, influxName)
		return await processInfluxData(result)
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene datos de medición relacionados con VI desde InfluxDB.
 *
 * @param {Object} data - Contiene la información del medidor (marca, versión y serie).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object>} Un objeto con los últimos datos de medición (`VI`, `Fasorial`, `Res`).
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento.
 * @author [Jose Romani] <jose.romani@hotmail.com>
 */
const getVIinflux = async (data, influxName) => {
	try {
		const query = `|> range(start: -1h, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Res")
		|> last()`
		const queryResult = await ConsultaInflux(query, influxName)
		const processedData = await processInfluxData(queryResult)
		return { VI: processedData }
	} catch (error) {
		throw error
	}
}

/**
 * Procesa los datos obtenidos desde InfluxDB para devolver un objeto simplificado.
 *
 * @param {Array} influxData - Datos crudos obtenidos desde InfluxDB.
 * @returns {Object} Un objeto con campos, valores y tiempos.
 * @author [Jose Romani] <jose.romani@hotmail.com>
 */
const processInfluxData = async (influxData) => {
	const dataMap = new Map()

	influxData.forEach((element) => {
		dataMap.set(element._field, {
			field: element._field,
			value: element._value,
			time: element._time,
		})
	})

	return Object.fromEntries(dataMap)
}

/**
 * Procesa datos de InfluxDB en formato de array agrupados por campos.
 *
 * @param {Array} influxData - Datos crudos obtenidos desde InfluxDB.
 * @returns {Object} Un objeto con arrays de datos por cada campo.
 * @author [Jose Romani] <jose.romani@hotmail.com>
 */
const processInfluxDataArray = async (influxData) => {
	const dataReturn = new Map()

	influxData.forEach((element) => {
		if (!dataReturn.has(element._field)) {
			dataReturn.set(element._field, [])
		}
		dataReturn.get(element._field).push({
			field: element._field,
			value: element._value,
			time: element._time,
			topic: element.topic,
		})
	})

	return Object.fromEntries(dataReturn)
}

// CURVA DE CARGA
/**
 * Consulta la curva de estado más reciente de un reconectador específico en InfluxDB.
 *
 * @param {Object} data - Información del reconectador:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio del rango en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin del rango en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object[]>} Datos procesados desde InfluxDB o un array vacío si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de los datos.
 * @author [Jose Romani] <jose.romani@hotmail.com>
 */
const getCurva = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-2mo',
			dateFinished: 'now()',
			limit: `|> sort(columns: ["_time"], desc: true)
                    |> limit(n: 400)
                    |> sort(columns: ["_time"], desc: false)`,
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
			attrQuery.limit = ''
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/curva" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial" )
						|> filter(fn: (r) => r["_field"] == "V_0" or r["_field"] == "V_1" or r["_field"] == "V_2" or r["_field"] == "Ev" or r["_field"] == "Date" or r["_field"] == "CFi" or r["_field"] == "AIP_1" or r["_field"] == "AcP_0" or r["_field"] == "AcP_1" or r["_field"] == "AcP_2" or r["_field"] == "VT_0" or r["_field"] == "VT_1")
						${attrQuery.limit}`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}
/**
 * Consulta información de voltaje y corriente de un reconectador específico en InfluxDB.
 *
 * @param {Object} data - Información del reconectador:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio del rango en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin del rango en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object[]>} Datos procesados desde InfluxDB o un array vacío si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de los datos.
 * @author [Jose Romani] <jose.romani@hotmail.com>
 */
const getVoltageCurrent = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-2mo',
			dateFinished: 'now()',
			limit: `|> sort(columns: ["_time"], desc: true)
                    |> limit(n: 400)
                    |> sort(columns: ["_time"], desc: false)`,
			every: '1m',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
			attrQuery.limit = ''
			attrQuery.every = '15m'
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial" )
						|> filter(fn: (r) => r["_field"] == "I_0" or r["_field"] == "I_1" or r["_field"] == "I_2" or r["_field"] == "V_0" or r["_field"] == "V_1" or r["_field"] == "V_2" or r["_field"] == "Date" or r["_field"] == "VT_0" or r["_field"] == "VT_1" or r["_field"] == "CT_0" or r["_field"] == "CT_1")
						|> aggregateWindow(every: ${attrQuery.every}, fn: last, createEmpty: false)
						${attrQuery.limit}`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}
/**
 * Consulta el coseno phi (CFi) de un reconectador específico en InfluxDB.
 *
 * @param {Object} data - Información del reconectador:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio del rango en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin del rango en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object[]>} Datos procesados desde InfluxDB o un array vacío si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de los datos.
 * @author [Jose Romani] <jose.romani@hotmail.com>
 */
const getCosenoFi = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-2mo',
			dateFinished: 'now()',
			limit: `|> sort(columns: ["_time"], desc: true)
                    |> limit(n: 400)
                    |> sort(columns: ["_time"], desc: false)`,
			every: '1m',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
			attrQuery.limit = ''
			attrQuery.every = '15m'
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial" )
						|> filter(fn: (r) => r["_field"] == "CFi_0" or r["_field"] == "CFi_1" or r["_field"] == "CFi_2" or r["_field"] == "Date")
						|> aggregateWindow(every: ${attrQuery.every}, fn: last, createEmpty: false)
						${attrQuery.limit}`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}
/**
 * Consulta datos gráficos (como voltaje, corriente, y potencia) de un reconectador específico en InfluxDB.
 *
 * @param {Object} data - Información del reconectador:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio del rango en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin del rango en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object[]>} Datos procesados desde InfluxDB o un array vacío si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de los datos.
 * @author [Jose Romani] <jose.romani@hotmail.com>
 */
const getInfoGraf = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-2d',
			dateFinished: 'now()',
			limit: `|> sort(columns: ["_time"], desc: true)
                    |> limit(n: 200)
                    |> sort(columns: ["_time"], desc: false)`,
			every: '1m',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
			attrQuery.limit = ''
			attrQuery.every = '15m'
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI" 
										  or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial" 
									      or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/P_exp" 
										  or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/P_imp" )
						|> aggregateWindow(every: ${attrQuery.every}, fn: last, createEmpty: false)
						${attrQuery.limit}`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene datos relacionados con sobretensiones en un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Array>} Un array con los datos procesados o vacío si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento.
 * @author José Romani
 */
const getInfoSurge = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-1mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnSob_1" 
						or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnSob_2" 
						or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnSob_3" 
						or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial") 
						|> filter(fn: (r) => r["_field"] == "VT_0" or r["_field"] == "VT_1" or r["_field"] == "D10_0" 
						or r["_field"] == "D10_1" or r["_field"] == "D10_2" or r["_field"] == "D10_3" or r["_field"] == "D1_0" 
						or r["_field"] == "D1_1" or r["_field"] == "D1_2" or r["_field"] == "D1_3" or r["_field"] == "D2_0" 
						or r["_field"] == "D2_1" or r["_field"] == "D2_2" or r["_field"] == "D2_3" or r["_field"] == "D3_0" 
						or r["_field"] == "D3_2" or r["_field"] == "D3_1" or r["_field"] == "D3_3" or r["_field"] == "D4_0" 
						or r["_field"] == "D4_1" or r["_field"] == "D4_2" or r["_field"] == "D4_3" or r["_field"] == "D5_0" 
						or r["_field"] == "D5_1" or r["_field"] == "D5_2" or r["_field"] == "D5_3" or r["_field"] == "D6_0" 
						or r["_field"] == "D6_1" or r["_field"] == "D6_2" or r["_field"] == "D6_3" or r["_field"] == "D7_0" 
						or r["_field"] == "D7_1" or r["_field"] == "D7_2" or r["_field"] == "D7_3" or r["_field"] == "D8_0" 
						or r["_field"] == "D8_1" or r["_field"] == "D8_2" or r["_field"] == "D8_3" or r["_field"] == "D9_0" 
						or r["_field"] == "D9_1" or r["_field"] == "D9_2" or r["_field"] == "D9_3")     
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene un resumen de las sobretensiones en un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Array>} Un array con el resumen de datos o vacío si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento.
 * @author José Romani
 */
const getInfoSurgeSummary = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-1mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReSob_1" 
						or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReSob_2" 
						or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReSob_3") 
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)
						|> last()`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene datos relacionados con subtensiones en un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Array>} Un array con los datos procesados o vacío si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento.
 * @author José Romani
 */
const getInfoUnderVoltage = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-1mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnSub_1" 
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnSub_2" 
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnSub_3"
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial") 
						|> filter(fn: (r) => r["_field"] == "VT_0" or r["_field"] == "VT_1" or r["_field"] == "D10_0" 
							or r["_field"] == "D10_1" or r["_field"] == "D10_2" or r["_field"] == "D10_3" or r["_field"] == "D1_0"
							or r["_field"] == "D1_1" or r["_field"] == "D1_2" or r["_field"] == "D1_3" or r["_field"] == "D2_0" 
							or r["_field"] == "D2_1" or r["_field"] == "D2_2" or r["_field"] == "D2_3" or r["_field"] == "D3_0" 
							or r["_field"] == "D3_2" or r["_field"] == "D3_1" or r["_field"] == "D3_3" or r["_field"] == "D4_0" 
							or r["_field"] == "D4_1" or r["_field"] == "D4_2" or r["_field"] == "D4_3" or r["_field"] == "D5_0" 
							or r["_field"] == "D5_1" or r["_field"] == "D5_2" or r["_field"] == "D5_3" or r["_field"] == "D6_0" 
							or r["_field"] == "D6_1" or r["_field"] == "D6_2" or r["_field"] == "D6_3" or r["_field"] == "D7_0" 
							or r["_field"] == "D7_1" or r["_field"] == "D7_2" or r["_field"] == "D7_3" or r["_field"] == "D8_0" 
							or r["_field"] == "D8_1" or r["_field"] == "D8_2" or r["_field"] == "D8_3" or r["_field"] == "D9_0" 
							or r["_field"] == "D9_1" or r["_field"] == "D9_2" or r["_field"] == "D9_3")                    
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene un resumen de las subtensiones en un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Array>} Un array con el resumen de datos o vacío si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento.
 * @author José Romani
 */
const getInfoUnderVoltageSummary = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-1mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReSub_1" 
						or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReSub_2" 
						or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReSub_3") 
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)
						|> last()`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene los Corte de tensión de un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object|null>} Un objeto con los datos procesados desde InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de datos.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInfoCourt = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-1mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnCor_1" 
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnCor_2" 
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnCor_3"
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial") 
						|> filter(fn: (r) => r["_field"] == "VT_0" or r["_field"] == "VT_1" or r["_field"] == "D10_0" 
							or r["_field"] == "D10_1" or r["_field"] == "D10_2" or r["_field"] == "D10_3" or r["_field"] == "D1_0"
							or r["_field"] == "D1_1" or r["_field"] == "D1_2" or r["_field"] == "D1_3" or r["_field"] == "D2_0" 
							or r["_field"] == "D2_1" or r["_field"] == "D2_2" or r["_field"] == "D2_3" or r["_field"] == "D3_0" 
							or r["_field"] == "D3_2" or r["_field"] == "D3_1" or r["_field"] == "D3_3" or r["_field"] == "D4_0" 
							or r["_field"] == "D4_1" or r["_field"] == "D4_2" or r["_field"] == "D4_3" or r["_field"] == "D5_0" 
							or r["_field"] == "D5_1" or r["_field"] == "D5_2" or r["_field"] == "D5_3" or r["_field"] == "D6_0" 
							or r["_field"] == "D6_1" or r["_field"] == "D6_2" or r["_field"] == "D6_3" or r["_field"] == "D7_0" 
							or r["_field"] == "D7_1" or r["_field"] == "D7_2" or r["_field"] == "D7_3" or r["_field"] == "D8_0" 
							or r["_field"] == "D8_1" or r["_field"] == "D8_2" or r["_field"] == "D8_3" or r["_field"] == "D9_0" 
							or r["_field"] == "D9_1" or r["_field"] == "D9_2" or r["_field"] == "D9_3")                    
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene el resumen de Corte de tensión de un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object|null>} Un objeto con los datos procesados desde InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de datos.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInfoCourtSummary = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-1mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReCor_1" 
						or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReCor_2" 
						or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReCor_3") 
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)
						|> last()`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene las interrupciones de un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object|null>} Un objeto con los datos procesados desde InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de datos.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInfoInterruption = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-1mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AntInt_1" 
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AntInt_2" 
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AntInt_3") 
						|> filter(fn: (r) =>  r["_field"] == "D10_0" or r["_field"] == "D10_1" or r["_field"] == "D1_0" 
							or r["_field"] == "D1_1" or r["_field"] == "D2_0" or r["_field"] == "D2_1" or r["_field"] == "D3_0" 
							or r["_field"] == "D3_1" or r["_field"] == "D4_0" or r["_field"] == "D4_1" or r["_field"] == "D5_0" 
							or r["_field"] == "D5_1" or r["_field"] == "D6_0" or r["_field"] == "D6_1" or r["_field"] == "D7_0" 
							or r["_field"] == "D7_1" or r["_field"] == "D8_0" or r["_field"] == "D8_1"  or r["_field"] == "D9_0" 
							or r["_field"] == "D9_1")                   
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene el resumen de las interrupciones de un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object|null>} Un objeto con los datos procesados desde InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de datos.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInfoInterruptionSummary = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-1mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReInt") 
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)
						|> last()`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Consulta el historial de reseteo de un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object|null>} Un objeto con los datos procesados desde InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de datos.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInfoHistoryReset = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-2mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/historical/Table_1") 
						|> filter(fn: (r) => r["_field"] == "uR_0" or r["_field"] == "uR_1" or r["_field"] == "uR_2" or r["_field"] == "uR_3")
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)
						|> last()`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxData(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Consulta el resumen historico de un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object|null>} Un objeto con los datos procesados desde InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de datos.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInfoHistorySummary = async (data, influxName) => {
	try {
		const attrQuery = {
			dateStart: '-2mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/historical/Table_5" or  r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI") 
						|> filter(fn: (r) => r["_field"] == "FP_0" or r["_field"] == "FP_1" or r["_field"] == "FP_2" 
							or r["_field"] == "Freq_0" or r["_field"] == "Freq_1" or r["_field"] == "Freq_2" 
							or r["_field"] == "Freq_3" or r["_field"] == "Temp_1" or r["_field"] == "Temp_0" 
							or r["_field"] == "Temp_2" or r["_field"] == "Temp_3" or r["_field"] == "Op_1")
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)
						|> last()`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxData(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Consulta el historico de tarifas de energia de un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object|null>} Un objeto con los datos procesados desde InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de datos.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInfoEnergyTarifa = async (data, influxName) => {
	try {
		const fechaActual = new Date()
		const attrQuery = {
			dateStart: '-3mo',
			dateFinished: `${fechaActual.getFullYear()}-${(fechaActual.getMonth() + 1).toString().padStart(2, '0')}-02`,
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		console.log(attrQuery)
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/historical/Table_4") 
						|> filter(fn: (r) => r["_field"] == "RTE_0" or r["_field"] == "RTE_1" or r["_field"] == "RTE_2")  
						|> aggregateWindow(every: 1mo, fn: last, createEmpty: false)
						|> sort(columns: ["_time"], desc: true)
						|> limit(n: 2)`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

/**
 * Consulta el historico de energia total de un reconectador específico desde InfluxDB.
 *
 * @param {Object} data - Información del reconectador, incluyendo:
 *   - {string} brand - Marca del reconectador.
 *   - {string} version - Versión del reconectador.
 *   - {string} serial - Número de serie del reconectador.
 *   - {date} [dateStart] - Fecha de inicio en formato ISO (opcional).
 *   - {date} [dateFinished] - Fecha de fin en formato ISO (opcional).
 * @param {string} influxName - Nombre de la base de datos InfluxDB.
 * @returns {Promise<Object|null>} Un objeto con los datos procesados desde InfluxDB, o `null` si no se encuentran datos.
 * @throws {Error} Si ocurre un error durante la consulta o el procesamiento de datos.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getInfoEnergyTotal = async (data, influxName) => {
	try {
		const fechaActual = new Date()
		const attrQuery = {
			dateStart: '-2mo',
			dateFinished: 'now()',
		}
		if (data.dateStart) {
			attrQuery.dateStart = `${data.dateStart}T00:00:00Z`
			attrQuery.dateFinished = `${data.dateFinished}T23:59:59Z`
		}
		console.log(attrQuery)
		const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/historical/Table_1" 
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/historical/Table_2" 
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/historical/Table_3" 
							or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/historical/Table_4") 
						|> filter(fn: (r) => r["_field"] == "uR_0" or r["_field"] == "uR_1" or r["_field"] == "uR_2" 
							or r["_field"] == "uR_3" or r["_field"] == "IET_0" or r["_field"] == "IET_1" or r["_field"] == "IET_10" 
							or r["_field"] == "IET_11" or r["_field"] == "IET_2" or r["_field"] == "IET_2_0" 
							or r["_field"] == "IET_2_1" or r["_field"] == "IET_2_10" or r["_field"] == "IET_2_11" 
							or r["_field"] == "IET_2_12" or r["_field"] == "IET_2_13" or r["_field"] == "IET_2_14" 
							or r["_field"] == "IET_2_2" or r["_field"] == "IET_2_15" or r["_field"] == "IET_2_3" 
							or r["_field"] == "IET_2_4" or r["_field"] == "IET_2_5" or r["_field"] == "IET_2_6" 
							or r["_field"] == "IET_2_7" or r["_field"] == "IET_2_9" or r["_field"] == "IET_2_8" 
							or r["_field"] == "IET_3" or r["_field"] == "IET_3_0" or r["_field"] == "IET_3_1" 
							or r["_field"] == "IET_3_10" or r["_field"] == "IET_3_11" or r["_field"] == "IET_3_12" 
							or r["_field"] == "IET_3_13" or r["_field"] == "IET_3_14" or r["_field"] == "IET_3_15" 
							or r["_field"] == "IET_3_3" or r["_field"] == "IET_3_2" or r["_field"] == "IET_3_4" 
							or r["_field"] == "IET_3_5" or r["_field"] == "IET_3_6" or r["_field"] == "IET_3_7" 
							or r["_field"] == "IET_3_8" or r["_field"] == "IET_3_9" or r["_field"] == "IET_4" 
							or r["_field"] == "IET_4_0" or r["_field"] == "IET_4_1" or r["_field"] == "IET_4_2" 
							or r["_field"] == "IET_4_3" or r["_field"] == "IET_4_4" or r["_field"] == "IET_4_5" 
							or r["_field"] == "IET_4_6" or r["_field"] == "IET_4_7" or r["_field"] == "IET_5" 
							or r["_field"] == "IET_6" or r["_field"] == "IET_8" or r["_field"] == "IET_7" or r["_field"] == "IET_9")  
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)
						|> last()`
		const result = await ConsultaInflux(query, influxName)
		const dataReturn = result.length > 0 ? await processInfluxData(result) : []
		return dataReturn
	} catch (error) {
		throw error
	}
}

module.exports = {
	getList,
	getxID,
	validateEnable,
	save,
	getStatus,
	getEnabled,
	getMetrologyBasic,
	getMetrologyPower,
	getMetrologyEnergy,
	getVIinflux,
	getCurva,
	getVoltageCurrent,
	getCosenoFi,
	getInfoGraf,
	getInfoSurge,
	getInfoUnderVoltage,
	getInfoSurgeSummary,
	getInfoUnderVoltageSummary,
	getInfoCourt,
	getInfoCourtSummary,
	getInfoInterruption,
	getInfoInterruptionSummary,
	getInfoHistoryReset,
	getInfoHistorySummary,
	getInfoEnergyTarifa,
	getInfoEnergyTotal,
}
