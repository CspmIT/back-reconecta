'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const date = new Date()
		await queryInterface.bulkInsert(
			'ColumnsTables',
			[
				// Tabla Recloser
				{ name: 'num_recloser', id_table: 1, status: 1, createdAt: date, updatedAt: date },
				{ name: 'name', id_table: 1, status: 1, createdAt: date, updatedAt: date },
				{ name: 'serial', id_table: 1, status: 1, createdAt: date, updatedAt: date },
				{ name: 'version', id_table: 1, status: 1, createdAt: date, updatedAt: date },
				{ name: 'status_recloser', id_table: 1, status: 1, createdAt: date, updatedAt: date },
				{ name: 'status_alarm', id_table: 1, status: 1, createdAt: date, updatedAt: date },
				// Tabla Meter
				{ name: 'num_serie', status: 1, id_table: 2, createdAt: date, updatedAt: date },
				{ name: 'device_name', status: 1, id_table: 2, createdAt: date, updatedAt: date },
				{ name: 'type_station', status: 1, id_table: 2, createdAt: date, updatedAt: date },
				{ name: 'version', status: 1, id_table: 2, createdAt: date, updatedAt: date },
				{ name: 'brand', status: 1, id_table: 2, createdAt: date, updatedAt: date },
				{ name: 'status', status: 1, id_table: 2, createdAt: date, updatedAt: date },
				// Tabla Sub Urban
				{ name: 'name', status: 1, id_table: 3, createdAt: date, updatedAt: date },
				{ name: 'location', status: 1, id_table: 3, createdAt: date, updatedAt: date },
				{ name: 'status', status: 1, id_table: 3, createdAt: date, updatedAt: date },
				// Tabla Sub Rural
				{ name: 'name_station', status: 1, id_table: 4, createdAt: date, updatedAt: date },
				{ name: 'user', status: 1, id_table: 4, createdAt: date, updatedAt: date },
				{ name: 'num_meter', status: 1, id_table: 4, createdAt: date, updatedAt: date },
				{ name: 'lat_point', status: 1, id_table: 4, createdAt: date, updatedAt: date },
				{ name: 'lng_point', status: 1, id_table: 4, createdAt: date, updatedAt: date },
				{ name: 'potencia_transformador', status: 1, id_table: 4, createdAt: date, updatedAt: date },
				{ name: 'status', status: 1, id_table: 4, createdAt: date, updatedAt: date },
				// Tabla Analizer
				{ name: 'name', status: 1, id_table: 5, createdAt: date, updatedAt: date },
				{ name: 'brand', status: 1, id_table: 5, createdAt: date, updatedAt: date },
				{ name: 'version', status: 1, id_table: 5, createdAt: date, updatedAt: date },
				{ name: 'serial', status: 1, id_table: 5, createdAt: date, updatedAt: date },
				// Tabla Nodos de infraestructura
				{ name: 'number', status: 1, id_table: 6, createdAt: date, updatedAt: date },
				{ name: 'name', status: 1, id_table: 6, createdAt: date, updatedAt: date },
				{ name: 'description', status: 1, id_table: 6, createdAt: date, updatedAt: date },
				{ name: 'node_history', status: 1, id_table: 6, createdAt: date, updatedAt: date },
			],
			{}
		)
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('ColumnsTables', null, {})
	},
}
