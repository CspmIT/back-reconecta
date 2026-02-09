'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('EquipmentModels', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			brand: {
				type: Sequelize.STRING,
			},
			type: {
				type: Sequelize.INTEGER,
			},
			description: {
				type: Sequelize.STRING,
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
	async down(queryInterface) {
		await queryInterface.removeConstraint('ControlsModels', 'ControlsModels_ibfk_1')
		await queryInterface.dropTable('EquipmentModels')
	},
}
