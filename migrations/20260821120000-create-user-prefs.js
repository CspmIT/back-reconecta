'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('UserPrefs', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_user: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: 'Users', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			module: {
				// Modulo dueno de la preferencia: 'map', 'unifilar', etc.
				type: Sequelize.STRING(50),
				allowNull: false,
			},
			payload: {
				// Layout de UI, sin estructura fija a proposito: es presentacion,
				// no se consulta ni se joinea. La geometria y la topologia van en
				// tablas (ver MapLines/MapLineVertices).
				type: Sequelize.JSON,
				allowNull: true,
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

		await queryInterface.addIndex('UserPrefs', ['id_user', 'module'], {
			unique: true,
			name: 'user_prefs_user_module',
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('UserPrefs')
	},
}
