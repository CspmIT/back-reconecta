'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('MeterTransformRatios', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_equipment: {
				allowNull: false,
				unique: true,
				type: Sequelize.INTEGER,
				references: {
					model: 'Equipment',
					key: 'id',
				},
			},
			vt_primary: {
				allowNull: false,
				type: Sequelize.FLOAT,
			},
			vt_secondary: {
				allowNull: false,
				type: Sequelize.FLOAT,
			},
			ct_primary: {
				allowNull: false,
				type: Sequelize.FLOAT,
			},
			ct_secondary: {
				allowNull: false,
				type: Sequelize.FLOAT,
			},
			// true = override manual activo; false = se usa la relacion leida del equipo
			// (se conservan los ultimos valores manuales para reactivarlos sin recargar)
			status: {
				allowNull: false,
				defaultValue: true,
				type: Sequelize.BOOLEAN,
			},
			id_user: {
				type: Sequelize.INTEGER,
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
		await queryInterface.dropTable('MeterTransformRatios')
	},
}
