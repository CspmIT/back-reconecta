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
const migrationTables = async (db, Tables) => {
	return db.sequelize.transaction(async (t) => {
		const savedTable = []
		for (const item of Tables) {
			const [Table, created] = await db.Table.findOrCreate({
				where: { name: item.name },
				defaults: { ...item },
				transaction: t,
			})
			if (!created) {
				await Table.update(item, { transaction: t })
			}
			savedTable.push(Table)
		}
		return savedTable
	})
}

/**
 * Migra las columnas proporcionadas a la base de datos, creando nuevas entradas si no existen
 * o actualizando las existentes.
 *
 * @param {Array<Object>} Columns - Un arreglo de objetos que representan las columnas a migrar.
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan las columnas migradas.
 * @throws {Error} Lanza un error si ocurre un problema durante la transacción.
 * @author Jose Romani <jose.romani@hotmail.com>
 *
 */
const migrationColumns = async (db, Columns) => {
	return db.sequelize.transaction(async (t) => {
		const savedTable = []
		for (const item of Columns) {
			const [Column, created] = await db.ColumnsTable.findOrCreate({
				where: { name: item.name, id_table: item.id_table },
				defaults: { ...item },
				transaction: t,
			})
			if (!created) {
				await Column.update(item, { transaction: t })
			}
			savedTable.push(Column)
		}
		return savedTable
	})
}

module.exports = {
	migrationTables,
	migrationColumns,
}
