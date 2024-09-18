'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Node_Histories', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_node: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Nodes',
					key: 'id',
				},
				allowNull: false,
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			id_device: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			type_device: {
				type: Sequelize.INTEGER,
				comment: '1: reconectador, 2: sub estación rural, 3: sub estación urbana',
				allowNull: false,
			},
			status: {
				type: Sequelize.TINYINT,
				allowNull: false,
				defaultValue: 1,
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
		await queryInterface.dropTable('Node_Histories')
	},
}
