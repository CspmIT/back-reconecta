'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		// La red: { nodos, elementos }. Es la fuente de verdad del módulo.
		//
		// Va aparte de `document` porque son dos cosas distintas y con distinto
		// dueño: `document` es el DWG importado, que no se toca nunca y sirve de
		// calco; `model` es la red que arma el usuario encima, con símbolos del
		// catálogo y conectividad real. Mezclarlas obligaría a reimportar el DWG
		// para cambiar la red, o a perder la red al reimportar el DWG.
		await queryInterface.addColumn('UnifilarPlans', 'model', {
			type: Sequelize.JSON,
			allowNull: true,
		})
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('UnifilarPlans', 'model')
	},
}
