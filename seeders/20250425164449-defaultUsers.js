'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		/**
		 * Add seed commands here.
		 *
		 * Example:
		 * await queryInterface.bulkInsert('People', [{
		 *   name: 'John Doe',
		 *   isBetaMember: false
		 * }], {});
		 */

		const date = new Date()
		await queryInterface.bulkInsert(
			'Users',
			[
				{
					first_name: 'Juan',
					last_name: 'Gonzalez',
					email: 'fgonzalez@coopmorteros.coop',
					profile: 4,
					status: 1,
					dark: 0,
					token_app: 'f5cd3c90-b94c-11ef-9315-17dc438c9123',
					createdAt: date,
					updatedAt: date,
				},
				{
					first_name: 'Agustin',
					last_name: 'Comba',
					email: 'acomba@coopmorteros.coop',
					profile: 4,
					status: 1,
					dark: 0,
					token_app: 'f5cd3c90-b94c-11ef-9315-17dc438c9123',
					createdAt: date,
					updatedAt: date,
				},
				{
					first_name: 'Leonardo',
					last_name: 'Depetris',
					email: 'ldepetris@coopmorteros.coop',
					profile: 4,
					status: 1,
					dark: 0,
					token_app: '33172770-d34a-11ef-b611-e55b66446d87',
					createdAt: date,
					updatedAt: date,
				},
			],
			{}
		)
	},

	async down(queryInterface, Sequelize) {
		/**
		 * Add commands to revert seed here.
		 *
		 * Example:
		 * await queryInterface.bulkDelete('People', null, {});
		 */
		await queryInterface.bulkDelete('Users', null, {})
	},
}
