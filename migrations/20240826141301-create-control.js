'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Controls', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			title: {
				type: Sequelize.STRING,
			},
			field: {
				type: Sequelize.STRING,
			},
			level: {
				type: Sequelize.TINYINT,
			},
			type_input: {
				type: Sequelize.STRING,
			},
			enabled: {
				type: Sequelize.TINYINT,
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
	async down(queryInterface) {
		await queryInterface.dropTable('Controls')
	},
}
