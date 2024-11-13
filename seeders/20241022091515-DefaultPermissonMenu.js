'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const date = new Date()
		await queryInterface.bulkInsert(
			'Menu_selecteds',
			[
				{ id_menu: 1, id_profile: 1, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 2, id_profile: 1, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 3, id_profile: 1, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 4, id_profile: 1, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 5, id_profile: 1, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 6, id_profile: 1, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 7, id_profile: 1, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 8, id_profile: 1, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 9, id_profile: 1, id_user: null, status: 1, createdAt: date, updatedAt: date },

				{ id_menu: 1, id_profile: 2, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 2, id_profile: 2, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 3, id_profile: 2, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 4, id_profile: 2, id_user: null, status: 0, createdAt: date, updatedAt: date },
				{ id_menu: 5, id_profile: 2, id_user: null, status: 0, createdAt: date, updatedAt: date },
				{ id_menu: 6, id_profile: 2, id_user: null, status: 0, createdAt: date, updatedAt: date },
				{ id_menu: 7, id_profile: 2, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 8, id_profile: 2, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 9, id_profile: 2, id_user: null, status: 0, createdAt: date, updatedAt: date },

				{ id_menu: 1, id_profile: 3, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 2, id_profile: 3, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 3, id_profile: 3, id_user: null, status: 0, createdAt: date, updatedAt: date },
				{ id_menu: 4, id_profile: 3, id_user: null, status: 0, createdAt: date, updatedAt: date },
				{ id_menu: 5, id_profile: 3, id_user: null, status: 0, createdAt: date, updatedAt: date },
				{ id_menu: 6, id_profile: 3, id_user: null, status: 0, createdAt: date, updatedAt: date },
				{ id_menu: 7, id_profile: 3, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 8, id_profile: 3, id_user: null, status: 0, createdAt: date, updatedAt: date },
				{ id_menu: 9, id_profile: 3, id_user: null, status: 0, createdAt: date, updatedAt: date },

				{ id_menu: 1, id_profile: 4, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 2, id_profile: 4, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 3, id_profile: 4, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 4, id_profile: 4, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 5, id_profile: 4, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 6, id_profile: 4, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 7, id_profile: 4, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 8, id_profile: 4, id_user: null, status: 1, createdAt: date, updatedAt: date },
				{ id_menu: 9, id_profile: 4, id_user: null, status: 1, createdAt: date, updatedAt: date },
			],
			{}
		)
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('Menu_selecteds', null, {})
	},
}
