const { db } = require('../models')

/**
 * Valida si un número de nodo está disponible para su uso.
 *
 * @param {string} number - El número del nodo a validar.
 * @param {number} idNode - El ID del nodo actual para evitar conflictos de actualización.
 * @returns {Promise<string|boolean>} Devuelve un mensaje si el número no está disponible o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const validateMeter = async (serial, id_version, id) => {
	try {
		const MeterElectricity = await db.MeterElectricity.findOne({
			where: {
				serial: serial,
				id_version: id_version,
			},
		})
		if (MeterElectricity === null) {
			return false
		} else {
			if (MeterElectricity.id != id) {
				return 'El numero de serie no esta disponible'
			} else {
				return false
			}
		}
	} catch (error) {
		throw error
	}
}
/**
 * Valida si un número de nodo está disponible para su uso.
 *
 * @param {string} number - El número del nodo a validar.
 * @param {number} idNode - El ID del nodo actual para evitar conflictos de actualización.
 * @returns {Promise<string|boolean>} Devuelve un mensaje si el número no está disponible o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const MeterAdd = async (data, transaction) => {
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
module.exports = {
	validateMeter,
	MeterAdd,
}
