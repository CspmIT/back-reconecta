'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Reclosers', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			serial: {
				type: Sequelize.STRING,
			},
			status: {
				type: Sequelize.BOOLEAN,
				defaultValue: true,
				allowNull: false,
			},
			status_recloser: {
				type: Sequelize.TINYINT,
				comment: '0= cerrado, 1= abierto, 2= sin tension, 3=sin datos o falla',
			},
			id_node: {
				type: Sequelize.INTEGER,
			},
			config: {
				type: Sequelize.TINYINT,
				comment: '0= Comun, 1= Especial',
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			updatedAt: {
				allowNull: true,
				type: Sequelize.DATE,
			},
		})
	},
	async down(queryInterface, Sequelize) {
		await queryInterface.dropTable('Reclosers')
	},
}
