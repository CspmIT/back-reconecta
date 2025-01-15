'use strict'
const ExcelJS = require('exceljs')
const { db } = require('../models')
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
			const id_version = await db.Version.findOne({ where: { name: 'F5' } })
			if (!id_version?.id) {
				throw new Error(`No se encontro la version del reconectador Cooper F5.`)
			}
			// Array para almacenar los datos
			const dataToInsert = []
			const date = new Date()
			worksheet.eachRow((row, rowNumber) => {
				if (rowNumber < 2) return // Omitir la fila de encabezados

				const id_event_influx = row.getCell(2).value
				const type_var = row.getCell(3).value
				const status0 = row.getCell(7).value
				const status1 = row.getCell(8).value
				const description = row.getCell(9).value
				const priority = row.getCell(14).value
				if (typeof id_event_influx != 'number') return
				if (status0) {
					dataToInsert.push({
						id_event_influx,
						name: status0,
						status: 1,
						priority: priority ? 1 : 3,
						alarm: 0,
						flash_screen: 0,
						id_version: id_version?.id,
						type_device: 'Reconectador',
						type_var,
						description,
						createdAt: date,
						updatedAt: date,
					})
				}
				if (status1) {
					dataToInsert.push({
						id_event_influx: id_event_influx + 1,
						name: status1,
						status: 1,
						priority: priority ? 1 : 3,
						alarm: 0,
						flash_screen: 0,
						id_version: id_version?.id,
						type_device: 'Reconectador',
						type_var,
						description,
						createdAt: date,
						updatedAt: date,
					})
				}
			})
			await queryInterface.bulkInsert('Events', dataToInsert)
			// console.log(dataToInsert)
		} catch (error) {
			console.error('Error procesando el archivo Excel:', error)
		}
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('Events', null, {})
	},
}
