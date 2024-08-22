'use strict'

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Versions', 'id_brand', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Brands',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})

		await queryInterface.addColumn('Reclosers', 'id_version', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Versions',
				key: 'id',
			},
			allowNull: false,
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE',
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Versions', 'id_brand')
		await queryInterface.removeColumn('Reclosers', 'id_version')
	},
}
