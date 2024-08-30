'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Controls', 'id_version', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Versions',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('Users_Controls', 'id_control', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Controls',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('Users_Controls', 'id_user', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('RecloserPasswords', 'id_user', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('RecloserSendMqtts', 'id_user', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('User_Columns', 'id_user', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Users',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('User_Columns', 'id_columnsTable', {
			type: Sequelize.INTEGER,
			references: {
				model: 'ColumnsTables',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
		await queryInterface.addColumn('ColumnsTables', 'id_table', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Tables',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Controls', 'id_version')
		await queryInterface.removeColumn('Users_Controls', 'id_control')
		await queryInterface.removeColumn('Users_Controls', 'id_user')
		await queryInterface.removeColumn('RecloserPasswords', 'id_user')
		await queryInterface.removeColumn('RecloserSendMqtts', 'id_user')
		await queryInterface.removeColumn('User_Columns', 'id_user')
		await queryInterface.removeColumn('User_Columns', 'id_columnsTable')
		await queryInterface.removeColumn('ColumnsTables', 'id_table')
	},
}
