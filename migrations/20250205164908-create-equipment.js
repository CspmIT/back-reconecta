'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Equipment', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_model: {
				type: Sequelize.INTEGER,
				references: {
					model: 'EquipmentModels',
					key: 'id',
				},
				allowNull: false,
			},
			serial: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			configuration: {
				type: Sequelize.INTEGER,
			},
			observation: {
				type: Sequelize.STRING,
			},
			id_element: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Elements',
					key: 'id',
				},
				allowNull: true,
			},
			id_user: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'Users',
					key: 'id',
				},
			},
			status: {
				type: Sequelize.BOOLEAN,
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			updatedAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
		})
	},
	async down(queryInterface, Sequelize) {
		await queryInterface.removeConstraint('Logs_Alarms', 'Logs_Alarms_id_device_Equipment_fk')
		await queryInterface.dropTable('Equipment')
	},
}
