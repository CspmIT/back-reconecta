const { ACTIONS, logAction } = require('./ActionLogService')

/**
 * Guarda una acción enviada a través de MQTT en la base de datos.
 *
 * @param {Object} data - Los datos de la acción a guardar en la tabla `RecloserSendMqtt`.
 * @returns {Promise<Object>} La acción guardada en la base de datos.
 * @throws {Error} Si ocurre algún problema durante la operación de guardado.
 * @author José Romani <jose.romani@hotmail.com>
 */
const saveSendActionMQTT = async (db, data) => {
	const ActionMqtt = await db.RecloserSendMqtt.create(data)
	// Unico punto por el que pasan todos los envios MQTT (Mqtt.controller y
	// Event.controller), asi el registro queda en un solo lugar.
	await logAction(db, {
		id_user: data.id_user,
		action: ACTIONS.MQTT_SEND,
		details: {
			serial: data.serial,
			brand: data.brand,
			mqtt_action: data.action,
		},
	})
	return ActionMqtt
}

module.exports = {
	saveSendActionMQTT,
}
