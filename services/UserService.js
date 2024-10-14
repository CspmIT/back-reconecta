const { Op } = require('sequelize')
const { db } = require('../models')

/**
 * Obtiene todos los usuarios activos de la base de datos.
 * Se consideran activos aquellos usuarios cuyo `status` sea igual a 1.
 *
 * @returns {Promise<Array<Object>>} Lista de usuarios activos.
 * @throws {Error} Si ocurre algún problema durante la consulta.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getAllUser = async () => {
	try {
		const listUser = await db.User.findAll({ where: { status: 1 } })
		return listUser
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene todos los usuarios activos junto con su relación de contraseñas de reconectadores.
 * Se incluyen aquellos usuarios cuyo `status` sea igual a 1 y que tengan una asociación con la entidad `passwordRecloser`.
 *
 * @returns {Promise<Array<Object>>} Lista de usuarios activos con la relación de contraseñas de reconectadores.
 * @throws {Error} Si ocurre algún problema durante la consulta o la inclusión de las asociaciones.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getAllUserPass = async () => {
	try {
		const listUser = await db.User.findAll({
			where: { status: 1 },
			include: {
				association: 'passwordRecloser',
			},
		})
		return listUser
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene todos los usuarios activos junto con su relación de contraseñas de reconectadores.
 * Se incluyen aquellos usuarios cuyo `status` sea igual a 1 y que tengan una asociación con la entidad `passwordRecloser`.
 *
 * @returns {Promise<Array<Object>>} Lista de usuarios activos con la relación de contraseñas de reconectadores.
 * @throws {Error} Si ocurre algún problema durante la consulta o la inclusión de las asociaciones.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getPassxID = async (id) => {
	try {
		const listUser = await db.RecloserPassword.findOne({
			where: { id_user: id },
		})
		return listUser
	} catch (error) {
		throw error
	}
}

/**
 * Guarda o actualiza la contraseña de un reconectador en la base de datos.
 * @param {Object} dataRecloser - Contiene los datos de la contraseña del reconectador, incluyendo `id_user`, `id` y otros atributos relevantes.
 * @param {Object} transaction - La transacción de la base de datos que se debe utilizar para esta operación (opcional).
 * @returns {Promise<Object>} El registro del reconectador guardado o actualizado.
 * @throws {Error} Si ocurre algún problema durante la transacción.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const savePassRecloser = async (dataRecloser, transaction) => {
	try {
		const [RecloserPassword, created] = await db.RecloserPassword.findOrCreate({
			where: { [Op.or]: [{ id_user: dataRecloser.id_user }, { id: dataRecloser.id || 0 }] },
			defaults: { ...dataRecloser },
			transaction,
		})
		if (!created) {
			await RecloserPassword.update(dataRecloser, { transaction })
		}
		return RecloserPassword
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene todos los usuarios activos junto con su relación de contraseñas de reconectadores.
 * Se incluyen aquellos usuarios cuyo `status` sea igual a 1 y que tengan una asociación con la entidad `passwordRecloser`.
 *
 * @returns {Promise<Array<Object>>} Lista de usuarios activos con la relación de contraseñas de reconectadores.
 * @throws {Error} Si ocurre algún problema durante la consulta o la inclusión de las asociaciones.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getAllProfile = async () => {
	try {
		const listProfiles = await db.Profile.findAll()
		return listProfiles
	} catch (error) {
		throw error
	}
}

module.exports = {
	getAllUser,
	getAllUserPass,
	getPassxID,
	savePassRecloser,
	getAllProfile,
}
