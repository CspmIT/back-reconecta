const { decrypt } = require('../utils/js/encrypt')

/**
 * Obtiene la configuración MQTT de una cooperativa desde la base de datos.
 *
 * @returns {Promise<Object>} Un objeto con la configuración MQTT que incluye el host, puerto y contraseña.
 * @throws {Error} Si no se encuentran los parámetros necesarios en la base de datos.
 * @author  Jose Romani <jose.romani@hotmail.com>
 */

const getConectionMqtt = async (db) => {
	const parameters = await db.Parameter.findAll({
		where: { type: 2 },
	})
	if (parameters.length === 0) {
		throw new Error('No se encontraron parámetros MQTT en la base de datos')
	}
	const data = parameters.reduce((acc, param) => {
		acc[param.name.toLowerCase()] = decrypt(param.value)
		return acc
	}, {})

	const config = {
		...data,
	}
	return config
}

module.exports = {
	getConectionMqtt,
}
