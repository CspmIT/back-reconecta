'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Versions', 'type_device', {
			type: Sequelize.ENUM,
			values: ['Reconectador', 'Medidor', 'Analizador'],
		})
		await queryInterface.addColumn('Brands', 'type_device', {
			type: Sequelize.ENUM,
			values: ['Reconectador', 'Medidor', 'Analizador'],
		})
		await queryInterface.changeColumn('Nodes', 'type', {
			type: Sequelize.ENUM,
			values: ['Reconectador', 'Sub estación rural', 'Sub estación urbana'],
		})
		await queryInterface.changeColumn('Node_Histories', 'type_device', {
			type: Sequelize.ENUM,
			values: ['Reconectador', 'Sub estación rural', 'Sub estación urbana'],
		})
		await queryInterface.changeColumn('Alarms_sents', 'type', {
			type: Sequelize.ENUM,
			values: ['Reconectador', 'Medidor', 'Analizador'],
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Versions', 'type_device')
		await queryInterface.removeColumn('Brands', 'type_device')
		await queryInterface.changeColumn('Nodes', 'type', {
			type: Sequelize.INTEGER,
			comment: '1: reconectador, 2: sub estación rural, 3: sub estación urbana, 4: otros dispositivos',
		})
		await queryInterface.changeColumn('Node_Histories', 'type_device', {
			type: Sequelize.INTEGER,
			comment: '1: reconectador, 2: sub estación rural, 3: sub estación urbana, 4: otros dispositivos',
		})
		await queryInterface.changeColumn('Alarms_sents', 'type', {
			type: Sequelize.ENUM,
			values: ['Recloser', 'Medidor', 'Analizador'],
		})
	},
}
