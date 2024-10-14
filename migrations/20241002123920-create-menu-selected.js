'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Menu_selecteds', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_menu: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Menus',
					key: 'id',
				},
				allowNull: false,
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			id_profile: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Profiles',
					key: 'id',
				},
				allowNull: true,
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			id_user: {
				type: Sequelize.INTEGER,
				references: {
					model: 'Users',
					key: 'id',
				},
				allowNull: true,
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			status: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: 1,
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
		await queryInterface.dropTable('Menu_selecteds')
	},
}
