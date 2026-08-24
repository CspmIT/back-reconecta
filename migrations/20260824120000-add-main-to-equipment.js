'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Equipment', 'is_main', {
			/*
			 * Marca el equipo que REPRESENTA al elemento cuando hay mas de uno del
			 * mismo tipo. Nace de un caso real: RE02 tiene dos reconectadores
			 * publicando a la vez (COOPER/002 instalado y ABB/1VYV91254078 de
			 * prueba) y el mapa no tenia con que decidir de cual mostrar estado y
			 * mediciones.
			 *
			 * OJO con los valores: principal = 1, NO principal = NULL, nunca 0.
			 * El indice unico de abajo es lo que garantiza "un solo principal por
			 * elemento", y MySQL permite NULL repetido en un indice unico pero no
			 * un 0 repetido. Si se guardara 0, el segundo equipo del elemento
			 * fallaria al guardarse.
			 */
			type: Sequelize.BOOLEAN,
			allowNull: true,
			defaultValue: null,
		})

		await queryInterface.addIndex('Equipment', ['id_element', 'is_main'], {
			unique: true,
			name: 'equipment_element_main',
		})
	},

	async down(queryInterface) {
		await queryInterface.removeIndex('Equipment', 'equipment_element_main')
		await queryInterface.removeColumn('Equipment', 'is_main')
	},
}
