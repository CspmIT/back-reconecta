const { db } = require('../models')

/**
 * Guarda una acción enviada a través de MQTT en la base de datos.
 *
 * @param {Object} data - Los datos de la acción a guardar en la tabla `RecloserSendMqtt`.
 * @returns {Promise<Object>} La acción guardada en la base de datos.
 * @throws {Error} Si ocurre algún problema durante la operación de guardado.
 * @author José Romani <jose.romani@hotmail.com>
 */
const getTask = async (id) => {
	try {
		const Task_Influx_Recloser = await db.Task_Influx_Recloser.findOne({ where: { id_recloser: id } })
		return Task_Influx_Recloser
	} catch (error) {
		throw error
	}
}

module.exports = {
	getTask,
}
