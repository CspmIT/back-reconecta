'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('ApiRequests', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				// BIGINT: es una tabla de alto volumen (un registro por request).
				type: Sequelize.BIGINT,
			},
			id_user: {
				// Nullable: hay requests sin sesion (login, rutas publicas).
				type: Sequelize.INTEGER,
				allowNull: true,
				references: { model: 'Users', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'SET NULL',
			},
			method: {
				type: Sequelize.STRING(10),
				allowNull: false,
			},
			path: {
				// Normalizado: los ids numericos se reemplazan por ':id' para que
				// /Equipment/5 y /Equipment/9 sean el mismo endpoint en el ranking.
				type: Sequelize.STRING(255),
				allowNull: false,
			},
			module: {
				// Agrupacion de negocio derivada del path (ver utils/auditModules.js).
				type: Sequelize.STRING(50),
				allowNull: false,
			},
			status: {
				type: Sequelize.SMALLINT,
				allowNull: false,
			},
			ms: {
				// Duracion del request en milisegundos.
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			error_message: {
				// Solo se completa en respuestas >= 400, para el detalle de errores.
				type: Sequelize.STRING(255),
				allowNull: true,
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
		})

		await queryInterface.addIndex('ApiRequests', ['createdAt'], {
			name: 'api_requests_created',
		})
		await queryInterface.addIndex('ApiRequests', ['status', 'createdAt'], {
			name: 'api_requests_status_created',
		})
		await queryInterface.addIndex('ApiRequests', ['module', 'createdAt'], {
			name: 'api_requests_module_created',
		})
		await queryInterface.addIndex('ApiRequests', ['id_user', 'createdAt'], {
			name: 'api_requests_user_created',
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('ApiRequests')
	},
}
