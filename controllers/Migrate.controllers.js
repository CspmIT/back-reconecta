const { getIdTable } = require('../services/ConfigUserService')
const { migrationTables, migrationColumns } = require('../services/MigrationServices')
const { columnsTables } = require('../utils/js/columsTables')
const { tables } = require('../utils/js/tables')
// AMBAS MIGRACIONES SE REALIZAN MEDIANTE SEEDER
// const generateTable = async (req, res) => {
// 	try {
// 		const result = await migrationTables(tables)
// 		return res.status(200).json(result)
// 	} catch (error) {
// 		if (error.errors) {
// 			res.status(500).json(error.errors)
// 		} else {
// 			res.status(400).json(error.message)
// 		}
// 	}
// }

// const generateColumns = async (req, res) => {
// 	try {
// 		for (const table of Object.keys(columnsTables)) {
// 			const idTable = await getIdTable(table)
// 			if (!idTable) return
// 			columnsTables[table].map((item) => {
// 				item.id_table = idTable.id
// 				return item
// 			})
// 			await migrationColumns(columnsTables[table])
// 		}
// 		return res.status(200).json(columnsTables)
// 	} catch (error) {
// 		if (error.errors) {
// 			res.status(500).json(error.errors)
// 		} else {
// 			res.status(400).json(error.message)
// 		}
// 	}
// }

module.exports = {
	// generateTable,
	// generateColumns,
}
