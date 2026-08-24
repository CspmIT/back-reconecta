'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Binnacle', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_element: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Elements',
					key: 'id',
				},
			},
			name_element: {
				type: Sequelize.STRING,
			},
			order: {
				type: Sequelize.STRING,
			},
			type_task: {
				allowNull: false,
				type: Sequelize.INTEGER,
				comment:
					'1) Mantenimiento preventivo - 2) Mantenimiento correctivo - 3) Inspección - 4) Instalación / Puesta en servicio - 5) Cambio / Reemplazo de equipo - 6) Reparación - 7) Otro',
			},
			date_task: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			status_task: {
				allowNull: false,
				type: Sequelize.ENUM('Programada', 'En curso', 'Completada', 'Cancelada', 'Vencida'),
			},
			day_task: {
				type: Sequelize.INTEGER,
			},
			hours_task: {
				type: Sequelize.INTEGER,
			},
			minutes_task: {
				allowNull: false,
				type: Sequelize.INTEGER,
			},
			description: {
				allowNull: false,
				type: Sequelize.STRING,
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
		await queryInterface.dropTable('Binnacle')
	},
}
