'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('ActionLogs', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_user: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: 'Users', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			action: {
				// Tipo de accion registrada. Se agregan valores nuevos con un
				// changeColumn en una migracion aparte.
				type: Sequelize.ENUM('LOGIN', 'MQTT_SEND'),
				allowNull: false,
			},
			details: {
				// Contexto libre de la accion (serial, marca, ip, etc.). Sin
				// estructura fija: cambia segun el tipo de accion.
				type: Sequelize.JSON,
				allowNull: true,
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
		})

		await queryInterface.addIndex('ActionLogs', ['id_user', 'createdAt'], {
			name: 'action_logs_user_created',
		})
		await queryInterface.addIndex('ActionLogs', ['action', 'createdAt'], {
			name: 'action_logs_action_created',
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('ActionLogs')
	},
}
