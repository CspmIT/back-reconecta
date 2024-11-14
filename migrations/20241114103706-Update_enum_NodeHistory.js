'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.changeColumn('Node_Histories', 'type_device', {
			type: Sequelize.ENUM,
			values: ['Reconectador', 'Medidor', 'Analizador', 'Sub estación rural', 'Sub estación urbana'],
		})

		await queryInterface.sequelize.query(`
      UPDATE Node_Histories
      SET type_device = 'Reconectador'
      WHERE type_device = 'Sub estación rural' OR type_device = 'Sub estación urbana'
  `)

		await queryInterface.changeColumn('Node_Histories', 'type_device', {
			type: Sequelize.ENUM,
			values: ['Reconectador', 'Medidor', 'Analizador'],
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.changeColumn('Node_Histories', 'type_device', {
			type: Sequelize.ENUM,
			values: ['Reconectador', 'Sub estación rural', 'Sub estación urbana'],
		})
	},
}
