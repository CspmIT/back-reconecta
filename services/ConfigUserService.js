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
				const [Column, created] = await db.User_Column.findOrCreate({ where: { id_columnsTable: item.id_columnsTable, id_user: item.id_user }, defaults: { ...item }, transaction: t })
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

module.exports = {
	getIdTable,
	getIdColumn,
	saveColumnUser,
	getColumnsUser,
}
