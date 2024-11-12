'use strict'

const { db } = require('../models')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const date = new Date()

		// Insert Brands y obtener sus IDs directamente desde el modelo Brand
		const brands = await db.Brand.bulkCreate(
			[
				{
					name: 'ITRON',
					status: 1,
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'HEXING',
					status: 1,
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'LANDIS',
					status: 1,
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'INHEMETER',
					status: 1,
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
			],
			{ returning: true } // Retorna los registros creados con sus IDs
		)

		// Crear un mapa de IDs de marcas basado en los nombres
		const brandMap = {}
		brands.forEach((brand) => {
			brandMap[brand.name] = brand.id
		})

		// Insert Versions con los IDs de marcas correspondientes
		await db.Version.bulkCreate(
			[
				{
					name: 'ACE6000',
					status: 1,
					id_brand: brandMap['ITRON'],
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'SL7000',
					status: 1,
					id_brand: brandMap['ITRON'],
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'HXE110',
					status: 1,
					id_brand: brandMap['HEXING'],
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'HXE310',
					status: 1,
					id_brand: brandMap['HEXING'],
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'XHEP12',
					status: 1,
					id_brand: brandMap['HEXING'],
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'CIUEVKP',
					status: 1,
					id_brand: brandMap['HEXING'],
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'ZMG310',
					status: 1,
					id_brand: brandMap['LANDIS'],
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
				{
					name: 'DDZ1513',
					status: 1,
					id_brand: brandMap['INHEMETER'],
					type_device: 2,
					createdAt: date,
					updatedAt: date,
				},
			],
			{}
		)
	},

	async down(queryInterface, Sequelize) {
		// Eliminar datos en el orden inverso
		await queryInterface.bulkDelete('Versions', null, {})
		await queryInterface.bulkDelete('Brands', null, {})
	},
}
