'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Nodes', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			name: {
				type: Sequelize.STRING,
			},
			number: {
				type: Sequelize.STRING,
			},
			description: {
				type: Sequelize.STRING,
			},
			lat_location: {
				type: Sequelize.DECIMAL(11, 6),
			},
			lng_location: {
				type: Sequelize.DECIMAL(11, 6),
			},
			status: {
				type: Sequelize.BOOLEAN,
				defaultValue: 1,
			},
			type: {
				type: Sequelize.INTEGER,
				comment: '1: reconectador, 2: sub estación rural, 3: sub estación urbana, 4: otros dispositivos',
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
		await queryInterface.dropTable('Nodes')
	},
}
