'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('UserChecksHome', 'id_map', {
			type: Sequelize.INTEGER,
			allowNull: true,
			after: 'type',
			references: {
				model: 'MapLocations',
				key: 'id',
			},
		})
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('UserChecksHome', 'id_map')
	},
}
