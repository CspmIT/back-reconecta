'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		// Documento editable del plano: entidades normalizadas en coordenadas
		// SVG. Es la fuente de verdad para el editor; `svg` es un derivado.
		await queryInterface.addColumn('UnifilarPlans', 'document', {
			type: Sequelize.JSON,
			allowNull: true,
		})
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('UnifilarPlans', 'document')
	},
}
