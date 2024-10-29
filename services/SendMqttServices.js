const { db } = require('../models')

/**
 * Guarda una acción enviada a través de MQTT en la base de datos.
 *
 * @param {Object} data - Los datos de la acción a guardar en la tabla `RecloserSendMqtt`.
 * @returns {Promise<Object>} La acción guardada en la base de datos.
 * @throws {Error} Si ocurre algún problema durante la operación de guardado.
 * @author José Romani <jose.romani@hotmail.com>
 */
const saveSendActionMQTT = async (data) => {
	try {
		const ActionMqtt = await db.RecloserSendMqtt.create(data)
		return ActionMqtt
	} catch (error) {
		throw error
	}
}

module.exports = {
	saveSendActionMQTT,
}
