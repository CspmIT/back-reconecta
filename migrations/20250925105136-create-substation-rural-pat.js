'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('SubstationRuralPats', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			value: {
				type: Sequelize.DECIMAL(18, 2),
			},
			id_element: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'Elements',
					key: 'id',
				},
			},
			status: {
				type: Sequelize.BOOLEAN,
			},
			id_user: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'Users',
					key: 'id',
				},
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
		await queryInterface.dropTable('SubstationRuralPats')
	},
}
