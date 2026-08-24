'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Logs_Alarms', 'type_alarm', {
			type: Sequelize.ENUM,
			values: ['Evento', 'Deadman'],
			defaultValue: 'Evento',
			allowNull: false,
			after: 'id',
		})
		await queryInterface.changeColumn('Logs_Alarms', 'id_event', {
			type: Sequelize.INTEGER,
			allowNull: true,
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Logs_Alarms', 'type_alarm')
		await queryInterface.changeColumn('Logs_Alarms', 'id_event', {
			type: Sequelize.INTEGER,
			allowNull: false,
		})
	},
}
