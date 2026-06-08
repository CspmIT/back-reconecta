'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('SubstationRuralClients', 'account', {
			type: Sequelize.INTEGER,
			allowNull: true,
			after: 'meter',
		})
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('SubstationRuralClients', 'account')
	},
}
