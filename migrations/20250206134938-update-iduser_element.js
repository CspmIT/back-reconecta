'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Elements', 'id_user', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: false,
		})
		await queryInterface.addColumn('Elements', 'id_user_edit', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Elements', 'id_user')
		await queryInterface.removeColumn('Elements', 'id_user_edit')
	},
}
