'use strict'

/*
 * Canal WhatsApp por usuario. El telefono no lo tipea el usuario: lo toma el
 * webhook del mensaje que el usuario manda al numero de Reconecta con su codigo
 * de vinculacion. Asi queda probado que el numero es suyo y el opt-in que pide
 * Meta sale del propio dueno del telefono.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('NotificationPrefs', 'whatsapp_phone', {
			// wa_id tal como lo informa Meta (solo digitos, con codigo de pais).
			type: Sequelize.STRING(20),
			allowNull: true,
		})
		await queryInterface.addColumn('NotificationPrefs', 'whatsapp_enabled', {
			// Opt-in vigente. El usuario lo apaga desde la app o escribiendo BAJA.
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		})
		await queryInterface.addColumn('NotificationPrefs', 'whatsapp_opt_in_at', {
			// Momento en que el usuario mando el codigo: es la constancia del opt-in.
			type: Sequelize.DATE,
			allowNull: true,
		})
		await queryInterface.addColumn('NotificationPrefs', 'whatsapp_code', {
			// Codigo de vinculacion pendiente (se borra al usarse).
			type: Sequelize.STRING(10),
			allowNull: true,
		})
		await queryInterface.addColumn('NotificationPrefs', 'whatsapp_code_expires_at', {
			type: Sequelize.DATE,
			allowNull: true,
		})
		await queryInterface.addIndex('NotificationPrefs', ['whatsapp_phone'])
		await queryInterface.addIndex('NotificationPrefs', ['whatsapp_code'])
	},

	async down(queryInterface) {
		await queryInterface.removeIndex('NotificationPrefs', ['whatsapp_code'])
		await queryInterface.removeIndex('NotificationPrefs', ['whatsapp_phone'])
		for (const column of [
			'whatsapp_code_expires_at',
			'whatsapp_code',
			'whatsapp_opt_in_at',
			'whatsapp_enabled',
			'whatsapp_phone',
		]) {
			await queryInterface.removeColumn('NotificationPrefs', column)
		}
	},
}
