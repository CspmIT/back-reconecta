const { db } = require('../models')
const { ConsultaInflux } = require('./InfluxServices')

/**
 * Obtiene todos los reconectadores de la base de datos.
 *
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan todos los reconectadores encontrados, o lanza un error si no se encuentra ninguno.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const getAllRecloser = async () => {
	try {
		const RecloserDesarrollo = await db.RecloserDesarrollo.findAll({ where: { status: 1 } })
		if (!RecloserDesarrollo) throw new Error('No existe ningun reconectador')
		return RecloserDesarrollo
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
		const RecloserDesarrollo = await db.RecloserDesarrollo.findOne({ where: { id: id } })
		if (!RecloserDesarrollo) throw new Error('No existe ningun reconectador')
		return RecloserDesarrollo
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
const dataRecloseInflux = async (data) => {
	try {
		const query = `|> range(start: -3m, stop: now())
        |> filter(fn: (r) => r["topic"] == "coop/energia/Reconectadores/${data.brand}/${data.serial}/status/channel_bin")
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`
		const dataInflux = await ConsultaInflux(query)
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

module.exports = { getAllRecloser, getRecloserId, brandRecloser, dataRecloseInflux }
