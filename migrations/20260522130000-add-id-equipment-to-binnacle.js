'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Binnacle', 'id_equipment', {
			type: Sequelize.INTEGER,
			allowNull: true,
			references: {
				model: 'Equipment',
				key: 'id',
			},
			after: 'id_element',
		})
	},
	async down(queryInterface) {
		await queryInterface.removeColumn('Binnacle', 'id_equipment')
	},
}
