'use strict'
const ExcelJS = require('exceljs')
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		try {
			const filePath = 'utils/variables/Tabla de variables Reconecta.xlsx'
			const sheetName = 'Cooper Form 5'
			const workbook = new ExcelJS.Workbook()
			await workbook.xlsx.readFile(filePath)

			// Seleccionar la hoja por nombre
			const worksheet = workbook.getWorksheet(sheetName)

			if (!worksheet) {
				throw new Error(`La hoja de trabajo "${sheetName}" no existe en el archivo.`)
			}

			// Array para almacenar los datos
			const dataToInsert = []

			worksheet.eachRow((row, rowNumber) => {
				if (rowNumber < 4) return // Omitir la fila de encabezados

				const idFabric = row.getCell(1).value
				const idReco = row.getCell(2).value
				const status1 = row.getCell(6).value
				const status0 = row.getCell(7).value
				const description = row.getCell(8).value
				if (typeof idReco != 'number') {
					return
				}
				dataToInsert.push({
					idFabric,
					idReco,
					status1,
					status0,
					description,
				})
			})

			console.log(dataToInsert)
		} catch (error) {
			console.error('Error procesando el archivo Excel:', error)
		}
	},

	async down(queryInterface, Sequelize) {
		/**
		 * Add commands to revert seed here.
		 *
		 * Example:
		 * await queryInterface.bulkDelete('People', null, {});
		 */
	},
}
