'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('MapLocations', 'name', {
			type: Sequelize.STRING,
		})
		await queryInterface.addColumn('Nodes', 'id_map', {
			type: Sequelize.INTEGER,
			references: {
				model: 'MapLocations',
				key: 'id',
			},
			defaultValue: 1,
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('MapLocations', 'name')
		await queryInterface.removeColumn('Nodes', 'id_map')
	},
}
