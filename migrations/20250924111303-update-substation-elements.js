'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.removeColumn('SubstationRuralClients', 'feed')
		await queryInterface.removeColumn('SubstationRuralClients', 'power')
		await queryInterface.removeColumn('SubstationRuralClients', 'pat')
		await queryInterface.addColumn('SubstationRuralClients', 'meter', {
			type: Sequelize.STRING,
			allowNull: true,
		})
		await queryInterface.removeColumn('Elements', 'serial')
		await queryInterface.addColumn('Elements', 'feed', {
			type: Sequelize.INTEGER,
			allowNull: true,
			comment: '(1 = monofasica, 2 = trifasica)',
		})
	},

	async down(queryInterface, Sequelize) {},
}
