'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('ApiTokens', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			name: {
				// Nombre que le pone quien lo crea, para reconocer la integracion
				// (ej: "SCADA proveedor X"). No es unico.
				type: Sequelize.STRING(100),
				allowNull: false,
			},
			token_prefix: {
				// Primeros caracteres del secreto, solo para mostrar en la lista y
				// que el usuario reconozca cual es cual. No alcanza para usarlo.
				type: Sequelize.STRING(16),
				allowNull: false,
			},
			token_hash: {
				// sha256 del secreto. El secreto completo se muestra una sola vez al
				// crearlo y nunca se guarda.
				type: Sequelize.STRING(64),
				allowNull: false,
			},
			influx_name: {
				// El login de Cooptech lo manda en el JWT y no esta en la base: se
				// copia del usuario que crea el token para poder consultar Influx.
				type: Sequelize.STRING(50),
				allowNull: false,
			},
			scopes: {
				// Lista de permisos del token, ej: ["equipments:read","metrology:read"]
				type: Sequelize.JSON,
				allowNull: false,
			},
			expires_at: {
				// NULL = no vence
				type: Sequelize.DATE,
				allowNull: true,
			},
			last_used_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			last_ip: {
				type: Sequelize.STRING(45),
				allowNull: true,
			},
			revoked_at: {
				// Se revoca y no se borra, para que la auditoria siga teniendo a
				// que token apuntar.
				type: Sequelize.DATE,
				allowNull: true,
			},
			id_user: {
				// Quien lo creo. Los requests del token se auditan a su nombre.
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: 'Users', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
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

		await queryInterface.addIndex('ApiTokens', ['token_hash'], {
			unique: true,
			name: 'api_tokens_hash',
		})

		// Alta y baja de tokens quedan en el registro de acciones
		await queryInterface.changeColumn('ActionLogs', 'action', {
			type: Sequelize.ENUM('LOGIN', 'MQTT_SEND', 'API_TOKEN_CREATE', 'API_TOKEN_REVOKE'),
			allowNull: false,
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('ActionLogs', { action: ['API_TOKEN_CREATE', 'API_TOKEN_REVOKE'] })
		await queryInterface.changeColumn('ActionLogs', 'action', {
			type: Sequelize.ENUM('LOGIN', 'MQTT_SEND'),
			allowNull: false,
		})
		await queryInterface.dropTable('ApiTokens')
	},
}
