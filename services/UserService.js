const { Op } = require('sequelize')

/**
 * Obtiene todos los usuarios activos de la base de datos.
 * Se consideran activos aquellos usuarios cuyo `status` sea igual a 1.
 *
 * @returns {Promise<Array<Object>>} Lista de usuarios activos.
 * @throws {Error} Si ocurre algún problema durante la consulta.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getAllUser = async (db) => {
	const listUser = await db.User.findAll({ where: { status: 1 } })
	return listUser
}

/**
 * Obtiene todos los usuarios activos junto con su relación de contraseñas de reconectadores.
 * Se incluyen aquellos usuarios cuyo `status` sea igual a 1 y que tengan una asociación con la entidad `passwordRecloser`.
 *
 * @returns {Promise<Array<Object>>} Lista de usuarios activos con la relación de contraseñas de reconectadores.
 * @throws {Error} Si ocurre algún problema durante la consulta o la inclusión de las asociaciones.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getAllUserPass = async (db) => {
	const listUser = await db.User.findAll({
		where: { status: 1 },
		include: {
			association: 'passwordRecloser',
		},
	})
	return listUser
}

/**
 * Obtiene todos los usuarios activos junto con su relación de contraseñas de reconectadores.
 * Se incluyen aquellos usuarios cuyo `status` sea igual a 1 y que tengan una asociación con la entidad `passwordRecloser`.
 *
 * @returns {Promise<Array<Object>>} Lista de usuarios activos con la relación de contraseñas de reconectadores.
 * @throws {Error} Si ocurre algún problema durante la consulta o la inclusión de las asociaciones.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getPassxID = async (db, id) => {
	const listUser = await db.RecloserPassword.findOne({
		where: { id_user: id },
	})
	return listUser
}

/**
 * Guarda o actualiza la contraseña de un reconectador en la base de datos.
 * @param {Object} dataRecloser - Contiene los datos de la contraseña del reconectador, incluyendo `id_user`, `id` y otros atributos relevantes.
 * @param {Object} transaction - La transacción de la base de datos que se debe utilizar para esta operación (opcional).
 * @returns {Promise<Object>} El registro del reconectador guardado o actualizado.
 * @throws {Error} Si ocurre algún problema durante la transacción.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const savePassRecloser = async (db, dataRecloser, transaction) => {
	const [RecloserPassword, created] = await db.RecloserPassword.findOrCreate({
		where: { [Op.or]: [{ id_user: dataRecloser.id_user }, { id: dataRecloser.id || 0 }] },
		defaults: { ...dataRecloser },
		transaction,
	})
	if (!created) {
		await RecloserPassword.update(dataRecloser, { transaction })
	}
	return RecloserPassword
}

/**
 * Obtiene todos los usuarios activos junto con su relación de contraseñas de reconectadores.
 * Se incluyen aquellos usuarios cuyo `status` sea igual a 1 y que tengan una asociación con la entidad `passwordRecloser`.
 *
 * @returns {Promise<Array<Object>>} Lista de usuarios activos con la relación de contraseñas de reconectadores.
 * @throws {Error} Si ocurre algún problema durante la consulta o la inclusión de las asociaciones.
 * @author [José Romani] <jose.romani@hotmail.com>
 */
const getAllProfile = async (db) => {
	const listProfiles = await db.Profile.findAll()
	return listProfiles
}

const getChecksxUser = async (db, data) => {
	const whereCondition = { id_user: data.user, status: 0 }
	if (data.type) {
		whereCondition.type = data.type
	}
	const listChecks = await db.UserChecksHome.findAll({
		where: whereCondition,
	})
	return listChecks
}

const saveChecksxUser = async (db, data) => {
	const whereCondition = { id_user: data.id_user, check: data.check, type: data.type }
	if (data.id_map) {
		whereCondition.id_map = data.id_map
	}
	const [check, created] = await db.UserChecksHome.findOrCreate({
		where: whereCondition,
		defaults: { ...data },
	})
	if (!created) {
		await check.update(data)
	}
	return check
}

const getUserxID = async (db, id) => {
	const user = await db.User.findOne({ where: { id, status: 1 } })
	return user
}

/**
 * Preferencias de UI por usuario y modulo. El payload es un JSON de layout sin
 * estructura fija: es presentacion, no se consulta ni se joinea. La geometria y
 * la topologia van en tablas (ver MapLines/MapLineVertices).
 */
const getPrefs = async (db, idUser, module) => {
	const pref = await db.UserPref.findOne({ where: { id_user: idUser, module } })
	return pref?.payload ?? null
}

const savePrefs = async (db, idUser, module, payload) => {
	const [pref, created] = await db.UserPref.findOrCreate({
		where: { id_user: idUser, module },
		defaults: { id_user: idUser, module, payload },
	})
	if (!created) await pref.update({ payload })
	return pref.payload
}

module.exports = {
	getPrefs,
	savePrefs,
	getAllUser,
	getAllUserPass,
	getPassxID,
	savePassRecloser,
	getAllProfile,
	getChecksxUser,
	saveChecksxUser,
	getUserxID,
}
