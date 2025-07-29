'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('GraphicsVariables', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			name: {
				type: Sequelize.STRING,
			},
			value: {
				type: Sequelize.FLOAT,
			},
			id_equipment: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Equipment',
					key: 'id',
				},
				allowNull: true,
			},
			id_graphic: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Graphics',
					key: 'id',
				},
				allowNull: false,
			},
			id_parent: {
				type: Sequelize.INTEGER,
			},
			color: {
				type: Sequelize.STRING,
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
		await queryInterface.dropTable('GraphicsVariables')
	},
}
