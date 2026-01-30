'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		const date = new Date()
		await queryInterface.bulkInsert(
			'Profiles',
			[
				{ description: 'Moderador', createdAt: date, updatedAt: date },
				{ description: 'Operador', createdAt: date, updatedAt: date },
				{ description: 'Lector', createdAt: date, updatedAt: date },
				{ description: 'Super Admin', createdAt: date, updatedAt: date },
			],
			{}
		)
	},

	async down(queryInterface) {
		await queryInterface.bulkDelete('Profiles', null, {})
	},
}
