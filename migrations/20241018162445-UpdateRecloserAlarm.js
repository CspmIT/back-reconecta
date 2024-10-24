'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Reclosers', 'status_alarm', {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: 1,
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Reclosers', 'status_alarm')
	},
}
