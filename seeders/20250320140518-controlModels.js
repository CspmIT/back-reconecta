'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		const date = new Date()
		const nojarc01 = [1, 2, 3, 4, 6, 5, 11, 14, 17]
		const nojarc10 = [
			1, 2, 3, 4, 6, 5, 31, 41, 8, 9, 10, 12, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
			29, 30,
		]
		const cooperf5 = [1, 3, 4, 32, 6, 5, 41, 33, 34, 35, 12, 37, 38, 39, 40]
		const cooperf6 = [1, 3, 4, 32, 6, 5, 41, 12, 42]
		const dataInsert = []
		nojarc01.forEach((control) => {
			dataInsert.push({
				id_model: 1,
				id_control: control,
				status: 1,
				createdAt: date,
				updatedAt: date,
			})
		})
		nojarc10.forEach((control) => {
			dataInsert.push({
				id_model: 2,
				id_control: control,
				status: 1,
				createdAt: date,
				updatedAt: date,
			})
		})
		cooperf5.forEach((control) => {
			dataInsert.push({
				id_model: 4,
				id_control: control,
				status: 1,
				createdAt: date,
				updatedAt: date,
			})
		})
		cooperf6.forEach((control) => {
			dataInsert.push({
				id_model: 5,
				id_control: control,
				status: 1,
				createdAt: date,
				updatedAt: date,
			})
		})
		/*
		 * El seeder se corrio mas de una vez sobre la misma base y duplico cada
		 * control (un `bulkInsert` no chequea nada), lo que se veia como controles
		 * repetidos en el tablero. Se insertan solo los pares que faltan.
		 */
		const [existentes] = await queryInterface.sequelize.query('SELECT id_model, id_control FROM ControlsModels')
		const yaCargados = new Set(existentes.map((item) => `${item.id_model}-${item.id_control}`))
		const faltantes = dataInsert.filter((item) => !yaCargados.has(`${item.id_model}-${item.id_control}`))
		if (!faltantes.length) return
		await queryInterface.bulkInsert('ControlsModels', faltantes)
	},

	async down(queryInterface) {
		await queryInterface.bulkDelete('ControlsModels', null, {})
	},
}
