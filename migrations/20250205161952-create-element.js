'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Elements', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			name: {
				type: Sequelize.STRING,
			},
			description: {
				type: Sequelize.STRING,
			},
			type: {
				type: Sequelize.INTEGER,
			},
			power: {
				type: Sequelize.STRING,
			},
			id_map: {
				type: Sequelize.INTEGER,
			},
			lat: {
				type: Sequelize.DECIMAL(17, 14),
			},
			lon: {
				type: Sequelize.DECIMAL(17, 14),
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
		await queryInterface.dropTable('Elements')
	},
}
