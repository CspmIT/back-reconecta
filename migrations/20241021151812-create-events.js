'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Events', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_event_influx: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			status: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
			},
			priority: {
				type: Sequelize.TINYINT,
				allowNull: false,
			},
			alarm: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
			},
			flash_screen: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
			},
			id_version: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			type: {
				type: Sequelize.ENUM,
				values: ['Reconectador', 'Medidor', 'Analizador'],
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
		await queryInterface.dropTable('Events')
	},
}
