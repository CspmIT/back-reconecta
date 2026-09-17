'use strict'

/**
 * Cliente de la tarea, como texto libre.
 *
 * Nullable a proposito: las bitacoras ya cargadas no tienen a quien atribuirles
 * el trabajo y ponerles una cadena vacia diria que el dato se completo, que es
 * otra cosa. Queda en NULL hasta que alguien lo cargue.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Binnacle', 'client', {
			type: Sequelize.STRING,
			allowNull: true,
			after: 'name_element',
		})
	},
	async down(queryInterface) {
		await queryInterface.removeColumn('Binnacle', 'client')
	},
}
