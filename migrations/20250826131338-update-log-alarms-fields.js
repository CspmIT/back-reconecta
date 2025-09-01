'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Logs_Alarms', 'eventDate', {
			type: Sequelize.INTEGER,
			allowNull: false,
			before: 'errors',
		})
		await queryInterface.addColumn('Logs_Alarms', 'info', {
			type: Sequelize.STRING,
			allowNull: true,
			before: 'errors',
		})
		await queryInterface.addConstraint('Logs_Alarms', {
			fields: ['id_device'],
			type: 'foreign key',
			references: {
				table: 'Equipment',
				field: 'id',
			},
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Logs_Alarms', 'eventDate')
		await queryInterface.removeColumn('Logs_Alarms', 'info')
	},
}
