'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		// La tabla anterior Binnacle_users (que apuntaba a Users del sistema) se
		// reemplaza por Binnacle_personal, vinculada al nuevo modelo Personal.
		await queryInterface.dropTable('Binnacle_users')
		await queryInterface.createTable('Binnacle_personal', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_binnacle: {
				type: Sequelize.INTEGER,
				references: { model: 'Binnacle', key: 'id' },
			},
			id_personal: {
				type: Sequelize.INTEGER,
				references: { model: 'Personal', key: 'id' },
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
		await queryInterface.dropTable('Binnacle_personal')
		await queryInterface.createTable('Binnacle_users', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_binnacle: { type: Sequelize.INTEGER },
			id_user: { type: Sequelize.INTEGER },
			createdAt: { allowNull: false, type: Sequelize.DATE },
			updatedAt: { allowNull: false, type: Sequelize.DATE },
		})
	},
}
