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
const getDateCheck = async (id, typeDevice) => {
	try {
		const dataResult = await db.Logs_check_alarms.findOne({
			where: { type: typeDevice, id_device: id },
			order: [['createdAt', 'DESC']],
		})
		return dataResult
	} catch (error) {
		throw error
	}
}
/**
 * Guarda múltiples registros de verificación de alarmas en la base de datos.
 *
 * @param {Array<Object>} logs - Un arreglo de objetos que representan los registros de verificación de alarmas.
 * @returns {Promise<Array>} Un arreglo de los registros creados en la base de datos.
 * @throws {Error} Lanza un error si ocurre algún problema durante la creación de los registros.
 * @author Jose Romani <jose.romani@hotmail.com>
 */
const addLogsChecks = async (logs) => {
	try {
		const dataResult = await db.Logs_check_alarms.bulkCreate(logs, { validate: true })
		return dataResult
	} catch (error) {
		throw error
	}
}

module.exports = {
	getDateCheck,
	addLogsChecks,
}
