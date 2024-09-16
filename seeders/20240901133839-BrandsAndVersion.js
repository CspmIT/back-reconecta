'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const date = new Date()
		await queryInterface.bulkInsert(
			'Brands',
			[
				{ name: 'NOJA', status: 1, createdAt: date, updatedAt: null },
				{ name: 'COOPER', status: 1, createdAt: date, updatedAt: null },
			],
			{}
		)
		await queryInterface.bulkInsert(
			'Versions',
			[
				{ name: 'RC_10', status: 1, id_brand: 1, createdAt: date, updatedAt: null },
				{ name: 'RC_01', status: 1, id_brand: 1, createdAt: date, updatedAt: null },
				{ name: 'F5', status: 1, id_brand: 2, createdAt: date, updatedAt: null },
			],
			{}
		)
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('Brands', null, {})
		await queryInterface.bulkDelete('Versions', null, {})
	},
}
