'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Events', 'type_var', {
			type: Sequelize.ENUM,
			values: ['Event', 'Output', 'Log'],
		})
		await queryInterface.addColumn('Events', 'description', {
			type: Sequelize.STRING,
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Events', 'type_var')
		await queryInterface.removeColumn('Events', 'description')
	},
}
