'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('PushSubscriptions', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_user: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: 'Users', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			endpoint: {
				// URL que da el navegador al suscribirse (FCM, Mozilla autopush,
				// APNs). Identifica al dispositivo: es la clave natural de la fila.
				type: Sequelize.STRING(500),
				allowNull: false,
			},
			p256dh: {
				// Clave publica del navegador para cifrar el payload (Web Push).
				type: Sequelize.STRING(255),
				allowNull: false,
			},
			auth: {
				// Secreto de autenticacion del navegador para el mismo cifrado.
				type: Sequelize.STRING(255),
				allowNull: false,
			},
			user_agent: {
				// Solo para que el usuario reconozca el dispositivo en la lista.
				type: Sequelize.STRING(255),
				allowNull: true,
			},
			last_success_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			last_error: {
				// Ultimo error del push service. Si es 404/410 la fila se borra.
				type: Sequelize.STRING(255),
				allowNull: true,
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

		await queryInterface.addIndex('PushSubscriptions', ['endpoint'], {
			unique: true,
			name: 'push_subscriptions_endpoint',
		})
		await queryInterface.addIndex('PushSubscriptions', ['id_user'], {
			name: 'push_subscriptions_user',
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('PushSubscriptions')
	},
}
