'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Equipment', 'id_user', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: false,
		})
		await queryInterface.addColumn('Equipment', 'id_user_edit', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Equipment', 'id_user')
	},
}
