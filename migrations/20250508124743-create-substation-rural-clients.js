'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('SubstationRuralClients', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			name: {
				type: Sequelize.STRING,
			},
			feed: {
				type: Sequelize.INTEGER,
			},
			power: {
				type: Sequelize.INTEGER,
			},
			pat: {
				type: Sequelize.DECIMAL,
			},
			id_element: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Elements',
					key: 'id',
				},
				allowNull: true,
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
		await queryInterface.dropTable('SubstationRuralClients')
	},
}
