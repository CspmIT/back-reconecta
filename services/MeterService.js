const { Op } = require('sequelize')
const { ConsultaInflux } = require('./InfluxServices')

/**
 * Obtiene una lista de medidores eléctricos con su información relacionada.
 *
 * @returns {Promise<Array>} Devuelve un arreglo con los registros de medidores eléctricos y sus asociaciones.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta a la base de datos.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getList = async (db) => {
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
}

/**
 * Obtiene información detallada de un medidor eléctrico basado en su ID.
 *
 * @param {number} id - El ID del medidor eléctrico.
 * @returns {Promise<Object>} Devuelve un objeto con los datos del medidor eléctrico.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getxID = async (db, id) => {
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
	const query = `|> range(start: -30m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/SCADA")
        |> aggregateWindow(every: 30ms, fn: last, createEmpty: false)
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
const validateEnable = async (db, serial, id_version, id) => {
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
const saveMeter = async (db, data, transaction) => {
	const [MeterElectricity, created] = await db.MeterElectricity.findOrCreate({
		where: { [Op.or]: [{ id: data.id }, { serial: data.serial, id_version: data.id_version }] },
		defaults: { ...data },
		transaction,
	})
	if (!created) {
		await MeterElectricity.update(data, { transaction })
	}
	return MeterElectricity
}

/**
 * Obtiene la relacion de transformacion manual (override) de un medidor por id de equipment.
 * Si no hay registro o status=false, el front usa la relacion leida del equipo.
 */
const getTransformRatio = async (db, id_equipment) => {
	return db.MeterTransformRatio.findOne({ where: { id_equipment } })
}

/**
 * Crea o actualiza el override manual de relacion de transformacion de un medidor.
 */
const saveTransformRatio = async (db, data) => {
	const [ratio, created] = await db.MeterTransformRatio.findOrCreate({
		where: { id_equipment: data.id_equipment },
		defaults: { ...data, status: true },
	})
	if (!created) {
		await ratio.update({ ...data, status: true })
	}
	return ratio
}

/**
 * Desactiva el override manual (vuelve a usarse la relacion leida del equipo).
 * Se conservan los ultimos valores manuales para poder reactivarlos.
 */
const disableTransformRatio = async (db, id_equipment) => {
	return db.MeterTransformRatio.update({ status: false }, { where: { id_equipment } })
}

/**
 * Obtiene una lista de dispositivos habilitados según el historial de sus relaciones.
 *
 * @returns {Promise<Object[]>} Devuelve una lista de dispositivos habilitados.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getEnabled = async (db) => {
	const meters = await getList(db)
	const result = meters.filter((item) => item.history.every((rel) => rel.status === 0) || item.history.length === 0)
	return result
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
	const [result1, result2, result3] = await Promise.all([
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
	const query = `|> range(start: -30m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/E_exp" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/E_imp" )
		|> last()`
	const result = await ConsultaInflux(query, influxName)
	return await processInfluxData(result)
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
	const query = `|> range(start: -30m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/P_exp" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/P_imp" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI" )
		|> last()`
	const result = await ConsultaInflux(query, influxName)
	return await processInfluxData(result)
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
	const query = `|> range(start: -1h, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Fasorial" or r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/Res")
		|> last()`
	const queryResult = await ConsultaInflux(query, influxName)
	const processedData = await processInfluxData(queryResult)
	return { VI: processedData }
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
/**
 * Convierte el valor de un filtro de fechas a timestamp de Flux: acepta fecha
 * sola (YYYY-MM-DD, se completa con la hora indicada) o fecha+hora ISO
 * (el front manda toISOString cuando el filtro incluye hora).
 * Flux no acepta fracciones de segundo en literales de tiempo -> se quitan
 * los milisegundos (2026-07-31T17:30:00.000Z rompe el parser, sin .000 no).
 */
const toInfluxTime = (value, fallbackTime) => {
	if (!value.includes('T')) return `${value}T${fallbackTime}Z`
	return value.replace(/\.\d+(Z?)$/, '$1').replace(/([^Z])$/, '$1Z')
}

// Rango por defecto de calidad de tension (VQD): desde el inicio del año en curso
const startOfYear = () => `${new Date().getFullYear()}-01-01T00:00:00Z`

const getCurva = async (data, influxName) => {
	const attrQuery = {
		dateStart: '-2mo',
		dateFinished: 'now()',
		limit: `|> sort(columns: ["_time"], desc: true)
                    |> limit(n: 400)
                    |> sort(columns: ["_time"], desc: false)`,
	}
	if (data.dateStart) {
		attrQuery.dateStart = toInfluxTime(data.dateStart, '00:00:00')
		attrQuery.dateFinished = toInfluxTime(data.dateFinished, '23:59:59')
		attrQuery.limit = ''
	}
	const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/curva")
						|> aggregateWindow(every: 15m, fn: last, createEmpty: false)
						${attrQuery.limit}`
	const result = await ConsultaInflux(query, influxName)
	const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
	return dataReturn
}
/**
 * Helper de antecedentes VQD: los topicos calidad/An* publican UN antecedente
 * por registro con fields D_0 (fecha), D_1 (duracion), D_2 (amplitud) y D_3 (fase).
 * La relacion VT para convertir la amplitud sale del ULTIMO status/Fasorial
 * (no hace falta traer su historico completo).
 */
const getQualityAntecedents = async (data, influxName, topicSuffix) => {
	const attrQuery = {
		dateStart: startOfYear(),
		dateFinished: 'now()',
	}
	if (data.dateStart) {
		attrQuery.dateStart = toInfluxTime(data.dateStart, '00:00:00')
		attrQuery.dateFinished = toInfluxTime(data.dateFinished, '23:59:59')
	}
	const baseTopic = `coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}`
	const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "${baseTopic}/calidad/${topicSuffix}")
						|> filter(fn: (r) => r["_field"] == "D_0" or r["_field"] == "D_1" or r["_field"] == "D_2" or r["_field"] == "D_3")
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)`
	const vtQuery = `	|> range(start: -1h, stop: now())
						|> filter(fn: (r) => r["topic"] == "${baseTopic}/status/Fasorial")
						|> filter(fn: (r) => r["_field"] == "VT_0" or r["_field"] == "VT_1")
						|> last()`
	const [result, vt] = await Promise.all([
		ConsultaInflux(query, influxName),
		ConsultaInflux(vtQuery, influxName),
	])
	const merged = [...result, ...vt]
	return merged.length > 0 ? processInfluxDataArray(merged) : []
}

/**
 * Antecedentes de sobretensiones (calidad/AnSob).
 */
const getInfoSurge = async (data, influxName) => getQualityAntecedents(data, influxName, 'AnSob')

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
	const attrQuery = {
		dateStart: startOfYear(),
		dateFinished: 'now()',
	}
	if (data.dateStart) {
		attrQuery.dateStart = toInfluxTime(data.dateStart, '00:00:00')
		attrQuery.dateFinished = toInfluxTime(data.dateFinished, '23:59:59')
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
const getInfoUnderVoltage = async (data, influxName) => getQualityAntecedents(data, influxName, 'AnSub')

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
	const attrQuery = {
		dateStart: startOfYear(),
		dateFinished: 'now()',
	}
	if (data.dateStart) {
		attrQuery.dateStart = toInfluxTime(data.dateStart, '00:00:00')
		attrQuery.dateFinished = toInfluxTime(data.dateFinished, '23:59:59')
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
const getInfoCourt = async (data, influxName) => getQualityAntecedents(data, influxName, 'AnCor')

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
	const attrQuery = {
		dateStart: startOfYear(),
		dateFinished: 'now()',
	}
	if (data.dateStart) {
		attrQuery.dateStart = toInfluxTime(data.dateStart, '00:00:00')
		attrQuery.dateFinished = toInfluxTime(data.dateFinished, '23:59:59')
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
	const attrQuery = {
		dateStart: startOfYear(),
		dateFinished: 'now()',
	}
	if (data.dateStart) {
		attrQuery.dateStart = toInfluxTime(data.dateStart, '00:00:00')
		attrQuery.dateFinished = toInfluxTime(data.dateFinished, '23:59:59')
	}
	// El topico anInt publica UN antecedente por registro: D_0 (fecha) y D_1 (valor numerico)
	const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/AnInt")
						|> filter(fn: (r) => r["_field"] == "D_0" or r["_field"] == "D_1")
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)`
	const result = await ConsultaInflux(query, influxName)
	const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
	return dataReturn
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
	const attrQuery = {
		dateStart: startOfYear(),
		dateFinished: 'now()',
	}
	if (data.dateStart) {
		attrQuery.dateStart = toInfluxTime(data.dateStart, '00:00:00')
		attrQuery.dateFinished = toInfluxTime(data.dateFinished, '23:59:59')
	}
	const query = `	|> range(start: ${attrQuery.dateStart}, stop: ${attrQuery.dateFinished})
						|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/calidad/ReInt")
						|> aggregateWindow(every: 10m, fn: last, createEmpty: false)
						|> last()`
	const result = await ConsultaInflux(query, influxName)
	const dataReturn = result.length > 0 ? await processInfluxDataArray(result) : []
	return dataReturn
}

// ============================================================
// ENERGIA (EOB) - un endpoint por seccion de la pestaña.
// Los datos se devuelven tal cual publica el medidor, agrupados por
// sufijo de topico y por field ({value, time} en orden cronologico);
// el shaping (periodos, tarifas, deltas) lo hace el front.
// TODO: confirmar los sufijos de topico y fields contra Influx (JSON pendiente).
// ============================================================

/**
 * Helper: consulta una lista de sufijos de topico y agrupa el resultado
 * por sufijo -> field -> [{field, value, time}].
 */
const queryEobTopics = async (data, influxName, topics, range) => {
	const baseTopic = `coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}`
	const filters = topics.map((topic) => `r["topic"] == "${baseTopic}/${topic}"`).join(' or ')
	const query = `	|> range(start: ${range.dateStart}, stop: ${range.dateFinished})
						|> filter(fn: (r) => ${filters})
						${range.extra ?? ''}`
	const result = await ConsultaInflux(query, influxName)

	const dataReturn = {}
	topics.forEach((topic) => {
		dataReturn[topic.split('/').pop()] = {}
	})
	result.forEach((element) => {
		const suffix = element.topic?.split('/').pop()
		const group = dataReturn[suffix]
		if (!group) return
		if (!group[element._field]) {
			group[element._field] = []
		}
		group[element._field].push({
			field: element._field,
			value: element._value,
			time: element._time,
		})
	})
	return dataReturn
}

const eobRange = (data, defaultStart) => {
	if (data.dateStart) {
		return {
			dateStart: toInfluxTime(data.dateStart, '00:00:00'),
			dateFinished: toInfluxTime(data.dateFinished, '23:59:59'),
		}
	}
	return { dateStart: defaultStart, dateFinished: 'now()' }
}

/**
 * Card fija del panel: reinicios del ultimo cierre de facturacion.
 * EOB/main publica una vez por mes -> se toma el ultimo registro (last, no mean).
 * Fields: rst_causa (codigo), rst (fecha DD/MM/YYYY HH:mm:ss), rst_num, rst_dias.
 */
const getEobSummary = async (data, influxName) => {
	return queryEobTopics(data, influxName, ['EOB/main'], {
		dateStart: '-3mo',
		dateFinished: 'now()',
		extra: '|> last()',
	})
}

/**
 * Modelo de factura (ver docs/eob-modelo-factura.json):
 *  - Cierres (una publicacion por mes, rango de 13 meses para el selector):
 *      EOB/main (rst + ai_t1..t3) · EOB/react (ri_tot) · EOB/maxdemand (dmax_tN_valor/fecha)
 *  - Mes en curso (registros vivos, solo el ultimo):
 *      status/E_tar (IAcE_Tar_0/2/4) · status/E_imp (IReE_3) · status/P_imp (DeM_Ta_0..5) · status/VI (CFi_3)
 */
const getEobInvoice = async (data, influxName) => {
	const closeTopics = ['EOB/main', 'EOB/react', 'EOB/maxdemand']
	const liveTopics = ['status/E_tar', 'status/E_imp', 'status/P_imp', 'status/VI']
	const closes = await queryEobTopics(data, influxName, closeTopics, eobRange(data, '-13mo'))
	// Los topics de status publican seguido: solo interesa el ultimo registro
	const live = await queryEobTopics(data, influxName, liveTopics, {
		dateStart: '-1h',
		dateFinished: 'now()',
		extra: '|> last()',
	})
	return { ...closes, ...live }
}

/**
 * Energia total (ver docs/eob-energia-total.json):
 *  - Ultimo cierre: EOB/main (ai/ae/ap por fase y total, ai_tN por tarifa, rst)
 *    y EOB/react (ri/re por fase y total, cuadrantes qN).
 *  - Acumulado vivo por tarifa: status/E_tar (IAcE_Tar_0/2/4); el front calcula
 *    la diferencia del periodo contra el ai_tN del cierre.
 */
const getEobEnergyTotal = async (data, influxName) => {
	const closes = await queryEobTopics(data, influxName, ['EOB/main', 'EOB/react'], {
		dateStart: '-3mo',
		dateFinished: 'now()',
		extra: '|> last()',
	})
	const live = await queryEobTopics(data, influxName, ['status/E_tar'], {
		dateStart: '-1h',
		dateFinished: 'now()',
		extra: '|> last()',
	})
	return { ...closes, ...live }
}

module.exports = {
	getList,
	getxID,
	validateEnable,
	saveMeter,
	getStatus,
	getEnabled,
	getMetrologyBasic,
	getMetrologyPower,
	getMetrologyEnergy,
	getVIinflux,
	getCurva,
	getInfoSurge,
	getInfoUnderVoltage,
	getInfoSurgeSummary,
	getInfoUnderVoltageSummary,
	getInfoCourt,
	getInfoCourtSummary,
	getInfoInterruption,
	getInfoInterruptionSummary,
	getEobSummary,
	getEobInvoice,
	getEobEnergyTotal,
	getTransformRatio,
	saveTransformRatio,
	disableTransformRatio,
}
