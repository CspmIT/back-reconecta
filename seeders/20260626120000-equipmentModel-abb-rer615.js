'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		const date = new Date()
		await queryInterface.bulkInsert('EquipmentModels', [
			{
				name: 'ABB',
				brand: 'RER615',
				description: 'Reconectador',
				type: 1,
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
		])
	},

	async down(queryInterface) {
		await queryInterface.bulkDelete('EquipmentModels', { name: 'ABB', brand: 'RER615' }, {})
	},
}
