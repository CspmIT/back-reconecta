'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
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

	async down(queryInterface, Sequelize) {},
}
