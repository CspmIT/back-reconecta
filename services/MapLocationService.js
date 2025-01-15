const { db } = require('../models')
/**
 * Obtiene el último registro de verificación de alarma para un dispositivo específico y tipo.
 *
 * @param {number} id - El ID del dispositivo.
 * @param {string} typeDevice - El tipo de dispositivo.
 * @returns {Promise<Object|null>} El registro más reciente de verificación de alarma o `null` si no se encuentra.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta a la base de datos.
 * @author Jose Romani <jose.romani@hotmail.com>
 */
const getListMaps = async (id, typeDevice) => {
	try {
		const dataResult = await db.MapLocation.findAll()
		return dataResult
	} catch (error) {
		throw error
	}
}

module.exports = {
	getListMaps,
}
