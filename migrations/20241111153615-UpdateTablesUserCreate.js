'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Nodes', 'id_user_create', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('Node_Histories', 'id_user_create', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('RecloserPasswords', 'id_user_create', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('Reclosers', 'id_user_create', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('Nodes', 'id_user_edit', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('Node_Histories', 'id_user_edit', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('RecloserPasswords', 'id_user_edit', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('Reclosers', 'id_user_edit', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: true,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Nodes', 'id_user_create')
		await queryInterface.removeColumn('Node_Histories', 'id_user_create')
		await queryInterface.removeColumn('RecloserPasswords', 'id_user_create')
		await queryInterface.removeColumn('Reclosers', 'id_user_create')
		await queryInterface.removeColumn('Nodes', 'id_user_edit')
		await queryInterface.removeColumn('Node_Histories', 'id_user_edit')
		await queryInterface.removeColumn('RecloserPasswords', 'id_user_edit')
		await queryInterface.removeColumn('Reclosers', 'id_user_edit')
	},
}
