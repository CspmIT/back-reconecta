'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Alarms_sents', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_device: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			type: {
				type: Sequelize.ENUM,
				values: ['Recloser', 'Medidor', 'Analizador'],
			},
			id_event: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Events',
					key: 'id',
				},
				allowNull: false,
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			status: {
				type: Sequelize.BOOLEAN,
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
	async down(queryInterface, Sequelize) {
		await queryInterface.dropTable('Alarms_sents')
	},
}
