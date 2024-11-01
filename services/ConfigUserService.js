const { db } = require('../models')
/**
 * Migra las tablas proporcionadas a la base de datos, creando nuevas entradas si no existen
 * o actualizando las existentes.
 *
 * @param {Array<Object>} Tables - Un arreglo de objetos que representan las tablas a migrar.
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan las tablas migradas.
 * @throws {Error} Lanza un error si ocurre un problema durante la transacción.
 * @author Jose Romani <jose.romani@hotmail.com>
 *
 */
const getIdTable = async (TableName) => {
	try {
		const Table = await db.Table.findOne({ where: { name: TableName } })
		return Table
	} catch (error) {
		throw error
	}
}

/**
 * Migra las tablas proporcionadas a la base de datos, creando nuevas entradas si no existen
 * o actualizando las existentes.
 *
 * @param {Array<Object>} Tables - Un arreglo de objetos que representan las tablas a migrar.
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan las tablas migradas.
 * @throws {Error} Lanza un error si ocurre un problema durante la transacción.
 * @author Jose Romani <jose.romani@hotmail.com>
 *
 */
const getIdColumn = async (table_id, column_name) => {
	try {
		const Column = await db.ColumnsTable.findOne({ where: { name: column_name, id_table: table_id } })
		return Column
	} catch (error) {
		throw error
	}
}

/**
 * Migra las tablas proporcionadas a la base de datos, creando nuevas entradas si no existen
 * o actualizando las existentes.
 *
 * @param {Array<Object>} Tables - Un arreglo de objetos que representan las tablas a migrar.
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan las tablas migradas.
 * @throws {Error} Lanza un error si ocurre un problema durante la transacción.
 * @author Jose Romani <jose.romani@hotmail.com>
 *
 */
const saveColumnUser = async (Columns) => {
	return db.sequelize.transaction(async (t) => {
		try {
			const savedColumns = []
			for (const item of Columns) {
				const [Column, created] = await db.User_Column.findOrCreate({
					where: { id_columnsTable: item.id_columnsTable, id_user: item.id_user },
					defaults: { ...item },
					transaction: t,
				})
				if (!created) {
					await Column.update(item, { transaction: t })
				}
				savedColumns.push(Column)
			}
			return savedColumns
		} catch (error) {
			throw error
		}
	})
}

/**
 * Migra las tablas proporcionadas a la base de datos, creando nuevas entradas si no existen
 * o actualizando las existentes.
 *
 * @param {Array<Object>} Tables - Un arreglo de objetos que representan las tablas a migrar.
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan las tablas migradas.
 * @throws {Error} Lanza un error si ocurre un problema durante la transacción.
 * @author Jose Romani <jose.romani@hotmail.com>
 *
 */
const getColumnsUser = async (id_table, id_user) => {
	try {
		const Columns = await db.User_Column.findAll({
			where: { id_user: id_user },
			include: [
				{
					association: 'columnsTable',
					where: { id_table: id_table },
				},
			],
		})
		return Columns
	} catch (error) {
		throw error
	}
}

/**
 * Migra las tablas proporcionadas a la base de datos, creando nuevas entradas si no existen
 * o actualizando las existentes.
 *
 * @param {Array<Object>} Tables - Un arreglo de objetos que representan las tablas a migrar.
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan las tablas migradas.
 * @throws {Error} Lanza un error si ocurre un problema durante la transacción.
 * @author Jose Romani <jose.romani@hotmail.com>
 *
 */
const getControlsRecloser = async (version) => {
	try {
		const idVersion = await db.Version.findOne({
			where: {
				name: version,
			},
		})
		const Controls = await db.Control.findAll({
			attributes: ['id', 'field', 'title', 'level', 'enabled', 'type_input'],
			where: { id_version: idVersion.id },
		})
		return Controls
	} catch (error) {
		throw error
	}
}
/**
 * Migra las tablas proporcionadas a la base de datos, creando nuevas entradas si no existen
 * o actualizando las existentes.
 *
 * @param {Array<Object>} Tables - Un arreglo de objetos que representan las tablas a migrar.
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan las tablas migradas.
 * @throws {Error} Lanza un error si ocurre un problema durante la transacción.
 * @author Jose Romani <jose.romani@hotmail.com>
 *
 */
const getControlsUserConfig = async (user, version) => {
	try {
		const idVersion = await db.Version.findOne({
			where: {
				name: version,
			},
		})
		const Controls = await db.Users_Control.findAll({
			where: { id_user: user },
			include: [
				{
					association: 'control',
					attributes: ['id', 'field', 'title', 'level', 'enabled', 'type_input'],
					where: { id_version: idVersion.id },
				},
			],
		})
		return Controls
	} catch (error) {
		throw error
	}
}

/**
 * Guarda o actualiza los controles de usuario en la base de datos en una transacción.
 * Si un control para el usuario ya existe, se actualiza con los datos proporcionados; de lo contrario, se crea un nuevo registro.
 *
 * @param {Array<Object>} Controls - Un arreglo de objetos que representan los controles de usuario a guardar o actualizar,
 *                                    cada objeto incluye `id_control` y `id_user` junto con otros atributos opcionales.
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan los controles de usuario guardados o actualizados.
 * @throws {Error} Lanza un error si ocurre algún problema durante la transacción.
 * @author Jose Romani <jose.romani@hotmail.com>
 */
const saveCrontrolsUser = async (Controls) => {
	return db.sequelize.transaction(async (t) => {
		try {
			const savedControls = []
			for (const item of Controls) {
				const [Control, created] = await db.Users_Control.findOrCreate({
					where: { id_control: item.id_control, id_user: item.id_user },
					defaults: { ...item },
					transaction: t,
				})
				if (!created) {
					await Control.update(item, { transaction: t })
				}
				savedControls.push(Control)
			}
			return savedControls
		} catch (error) {
			throw error
		}
	})
}
module.exports = {
	getIdTable,
	getIdColumn,
	saveColumnUser,
	getColumnsUser,
	getControlsRecloser,
	getControlsUserConfig,
	saveCrontrolsUser,
}
