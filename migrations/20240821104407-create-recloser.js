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
			name: {
				type: Sequelize.STRING,
			},
			serial: {
				type: Sequelize.STRING,
			},
			lat_location: {
				type: Sequelize.DECIMAL(11, 6),
			},
			lng_location: {
				type: Sequelize.DECIMAL(11, 6),
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
			status_alarm_recloser: {
				type: Sequelize.BOOLEAN,
			},
			num_recloser: {
				type: Sequelize.STRING,
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
