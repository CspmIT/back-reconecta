'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('UnifilarPlans', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			file_name: {
				// Nombre original del .dwg subido
				type: Sequelize.STRING,
				allowNull: false,
			},
			dwg_path: {
				// Ruta del archivo guardado en el servidor
				type: Sequelize.STRING,
				allowNull: false,
			},
			svg: {
				// SVG generado por la conversión; null hasta que se procese
				type: Sequelize.TEXT('long'),
				allowNull: true,
			},
			data: {
				// Metadata de la conversión: capas, bloques y mapeo entidad→equipo
				type: Sequelize.JSON,
				allowNull: true,
			},
			status: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: 1,
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			updatedAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('UnifilarPlans')
	},
}
