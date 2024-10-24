const { Op } = require('sequelize')
const { db } = require('../models')

/**
 * Obtiene todos los menús activos de la base de datos.
 *
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan todos los menús activos encontrados.
 * @throws {Error} Si no se encuentran menús activos en la base de datos.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const getMenus = async () => {
	try {
		const Variables = await db.Menu.findAll({
			order: [['order']],
		})
		if (!Variables) throw new Error('No existe ningun reconectador')
		return Variables.map((variable) => variable.get({ plain: true }))
	} catch (error) {
		throw error
	}
}

/**
 * Guarda un menú en la base de datos. Si el menú ya existe, se actualiza.
 *
 * @param {Object} dataMenu - Datos del menú a guardar o actualizar.
 * @param {Object} transaction - Transacción utilizada para ejecutar la operación de guardado/actualización.
 * @returns {Promise<Object>} El menú guardado o actualizado.
 * @throws {Error} Si ocurre algún problema durante el proceso de guardado o actualización.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const saveMenu = async (dataMenu, transaction) => {
	try {
		const [Menu, created] = await db.Menu.findOrCreate({
			where: { id: dataMenu.id },
			defaults: { ...dataMenu },
			transaction,
		})
		if (!created) {
			await Menu.update(dataMenu, { transaction })
		}
		return Menu
	} catch (error) {
		throw error
	}
}

/**
 * Guarda un menú en la base de datos. Si el menú ya existe, se actualiza.
 *
 * @param {Object} dataMenu - Datos del menú a guardar o actualizar.
 * @param {Object} transaction - Transacción utilizada para ejecutar la operación de guardado/actualización.
 * @returns {Promise<Object>} El menú guardado o actualizado.
 * @throws {Error} Si ocurre algún problema durante el proceso de guardado o actualización.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const listPermissionUser = async (data) => {
	try {
		const filters =
			data.type == 'id_user'
				? { [Op.or]: [{ [`${data.type}`]: data.id }, { id_profile: data.profile }] }
				: { [`${data.type}`]: data.profile }
		const Menus = await db.Menu_selected.findAll({ where: filters })
		if (!Menus) throw new Error('No existe ningun reconectador')
		return Menus.map((menu) => menu.get({ plain: true }))
	} catch (error) {
		throw error
	}
}

/**
 * Guarda un menú en la base de datos. Si el menú ya existe, se actualiza.
 *
 * @param {Object} dataMenu - Datos del menú a guardar o actualizar.
 * @param {Object} transaction - Transacción utilizada para ejecutar la operación de guardado/actualización.
 * @returns {Promise<Object>} El menú guardado o actualizado.
 * @throws {Error} Si ocurre algún problema durante el proceso de guardado o actualización.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const saveMenu_Selected = async (dataMenu, transaction) => {
	try {
		const [Menu_selected, created] = await db.Menu_selected.findOrCreate({
			where: { id: dataMenu.id },
			defaults: { ...dataMenu },
			transaction,
		})
		if (!created) {
			await Menu_selected.update(dataMenu, { transaction })
		}
		return Menu_selected
	} catch (error) {
		throw error
	}
}

module.exports = {
	getMenus,
	saveMenu,
	listPermissionUser,
	saveMenu_Selected,
}
