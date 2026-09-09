/**
 * Registro de acciones de usuario (tabla `ActionLogs`).
 *
 * El log nunca debe cortar el flujo que lo origina: si falla el insert se
 * reporta por consola y la operacion original sigue su curso.
 */

// Espejo del ENUM de la columna `action`. Agregar un valor nuevo requiere
// tambien un changeColumn en una migracion.
const ACTIONS = {
	LOGIN: 'LOGIN',
	MQTT_SEND: 'MQTT_SEND',
}

/**
 * Guarda una accion en el registro.
 *
 * @param {Object} db - Instancia de la db del tenant.
 * @param {Object} params
 * @param {number} params.id_user - Usuario que ejecuto la accion.
 * @param {string} params.action - Uno de los valores de `ACTIONS`.
 * @param {Object} [params.details] - Contexto libre de la accion.
 * @returns {Promise<Object|null>} El registro creado, o null si fallo.
 */
const logAction = async (db, { id_user, action, details = null }) => {
	try {
		return await db.ActionLog.create({ id_user, action, details })
	} catch (error) {
		console.error(`No se pudo registrar la accion ${action} del usuario ${id_user}:`, error.message)
		return null
	}
}

/**
 * Datos de origen del request, para sumar al `details` de la accion.
 *
 * @param {Object} req - Request de express.
 * @returns {Object} ip y user_agent de quien hizo el pedido.
 */
const requestInfo = (req) => ({
	ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || null,
	user_agent: req.headers['user-agent'] || null,
})

module.exports = { ACTIONS, logAction, requestInfo }
