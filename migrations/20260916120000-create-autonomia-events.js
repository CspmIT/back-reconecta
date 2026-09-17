'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		// Inventario de programaciones y configuraciones hechas desde AutonomIA:
		// qué placa (MAC) quedó con qué firmware, quién lo hizo y cuándo.
		await queryInterface.createTable('AutonomiaEvents', {
			id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
			id_user: {
				type: Sequelize.INTEGER,
				allowNull: true,
				references: { model: 'Users', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'SET NULL',
			},
			tipo: { type: Sequelize.STRING(10), allowNull: false },
			modo: { type: Sequelize.STRING(20), allowNull: true },
			modelo: { type: Sequelize.STRING(80), allowNull: true },
			version: { type: Sequelize.STRING(40), allowNull: true },
			chip: { type: Sequelize.STRING(40), allowNull: true },
			mac: { type: Sequelize.STRING(32), allowNull: true },
			nombre_equipo: { type: Sequelize.STRING(80), allowNull: true },
			resultado: { type: Sequelize.STRING(10), allowNull: false },
			detalle: { type: Sequelize.STRING(500), allowNull: true },
			createdAt: { allowNull: false, type: Sequelize.DATE },
			updatedAt: { allowNull: false, type: Sequelize.DATE },
		})
		await queryInterface.addIndex('AutonomiaEvents', ['mac'], { name: 'autonomia_events_mac' })
		await queryInterface.addIndex('AutonomiaEvents', ['createdAt'], { name: 'autonomia_events_created' })
	},

	async down(queryInterface) {
		await queryInterface.dropTable('AutonomiaEvents')
	},
}
