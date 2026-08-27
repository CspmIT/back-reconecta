'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('MapLines', 'color', {
			/*
			 * Color del trazo, en hexadecimal #rrggbb. NULL = el color por defecto
			 * que decide el front (LINE_STYLE), asi que cambiarlo ahi sigue
			 * alcanzando para los tramos que nunca se pintaron a mano.
			 */
			type: Sequelize.STRING(7),
			allowNull: true,
			defaultValue: null,
		})
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('MapLines', 'color')
	},
}
