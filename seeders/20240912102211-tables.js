'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const date = new Date()
		await queryInterface.bulkInsert(
			'Tables',
			[
				{ createdAt: date, updatedAt: date, name: 'recloser', view: 'Home', status: 1 },
				{ createdAt: date, updatedAt: date, name: 'meter', view: 'Home', status: 1 },
				{ createdAt: date, updatedAt: date, name: 'sub_urban', view: 'Home', status: 1 },
				{ createdAt: date, updatedAt: date, name: 'sub_rural', view: 'Home', status: 1 },
				{ createdAt: date, updatedAt: date, name: 'analizer', view: 'Home', status: 1 },
				{ createdAt: date, updatedAt: date, name: 'node', view: 'Home', status: 1 },
			],
			{}
		)
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('Tables', null, {})
	},
}
