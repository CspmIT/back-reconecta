'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		// Nombre del objeto en MinIO (`<uuid>.bin`, lo asigna el gateway).
		// Reemplaza a `dwg_path` como referencia al archivo original: el .dwg
		// deja de vivir en el disco del servidor, así que la ruta local ya no
		// sobrevive a un redeploy del contenedor.
		await queryInterface.addColumn('UnifilarPlans', 'dwg_key', {
			type: Sequelize.STRING,
			allowNull: true,
		})
		// Los planos viejos siguen teniendo su ruta local y ninguna key, así que
		// la columna pasa a ser opcional en vez de migrar los archivos.
		await queryInterface.changeColumn('UnifilarPlans', 'dwg_path', {
			type: Sequelize.STRING,
			allowNull: true,
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('UnifilarPlans', 'dwg_key')
		await queryInterface.changeColumn('UnifilarPlans', 'dwg_path', {
			type: Sequelize.STRING,
			allowNull: false,
		})
	},
}
