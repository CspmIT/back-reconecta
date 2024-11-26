'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('MeterElectricities', 'id_node', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Nodes',
				key: 'id',
			},
			allowNull: true,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('MeterElectricities', 'id_node')
	},
}
