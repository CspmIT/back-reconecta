'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('NotificationPrefs', {
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
			enabled: {
				// Interruptor general del usuario. En false no le llega ningun push.
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			timezone: {
				// Zona con la que se evalua la ventana de silencio.
				type: Sequelize.STRING(60),
				allowNull: false,
				defaultValue: 'America/Argentina/Cordoba',
			},
			quiet_enabled: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			quiet_start: {
				// Inicio de la ventana de silencio, hora local del usuario.
				type: Sequelize.TIME,
				allowNull: true,
			},
			quiet_end: {
				// Fin de la ventana. Si es menor que el inicio, cruza medianoche
				// (22:00 -> 07:00).
				type: Sequelize.TIME,
				allowNull: true,
			},
			quiet_days: {
				// Dias en los que aplica el silencio, 0=domingo .. 6=sabado.
				// null o vacio = todos los dias.
				type: Sequelize.JSON,
				allowNull: true,
			},
			quiet_allow_critical: {
				// Deja pasar las alarmas de prioridad 1 aunque este en silencio.
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			muted_alarm_types: {
				// Subconjunto de ['Evento', 'Deadman'].
				type: Sequelize.JSON,
				allowNull: true,
			},
			muted_device_types: {
				// Subconjunto de ['Reconectador', 'Medidor', 'Analizador'].
				type: Sequelize.JSON,
				allowNull: true,
			},
			muted_events: {
				// Ids de Events silenciados (alarma puntual, no todo el tipo).
				type: Sequelize.JSON,
				allowNull: true,
			},
			muted_devices: {
				// Ids de Equipment silenciados.
				type: Sequelize.JSON,
				allowNull: true,
			},
			min_priority: {
				// Notificar solo prioridad <= N (1 es la mas alta). null = todas.
				type: Sequelize.TINYINT,
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

		await queryInterface.addIndex('NotificationPrefs', ['id_user'], {
			unique: true,
			name: 'notification_prefs_user',
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('NotificationPrefs')
	},
}
