'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		const date = new Date()
		// Guarda de idempotencia: los esquemas viejos no tienen SequelizeData,
		// así que el seeder puede correrse dos veces sobre la misma base.
		const [[existing]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE name = 'Unifilar' LIMIT 1"
		)
		if (existing) return

		// group_menu identifica cada menú de primer nivel y cada base puede tener
		// grupos propios creados desde la UI de Accesos: tomar el siguiente libre.
		const [[{ nextGroup }]] = await queryInterface.sequelize.query(
			'SELECT COALESCE(MAX(group_menu), 0) + 1 AS nextGroup FROM Menus'
		)
		// Ubica "Unifilar" justo después de "Diagrama" (order 4): corre una
		// posición los menús siguientes y usa el hueco.
		await queryInterface.sequelize.query('UPDATE Menus SET `order` = `order` + 1 WHERE `order` >= 5')
		await queryInterface.bulkInsert(
			'Menus',
			[
				{
					name: 'Unifilar',
					link: 'unifilar',
					icon: 'FaSitemap',
					level: '1',
					group_menu: nextGroup,
					sub_menu: null,
					status: '1',
					order: 5,
					createdAt: date,
					updatedAt: date,
				},
			],
			{}
		)
		const [[menu]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE name = 'Unifilar' LIMIT 1"
		)
		// Misma visibilidad que "Diagrama": habilitado para los 4 perfiles.
		await queryInterface.bulkInsert(
			'Menu_selecteds',
			[1, 2, 3, 4].map((profile) => ({
				id_menu: menu.id,
				id_profile: profile,
				id_user: null,
				status: 1,
				createdAt: date,
				updatedAt: date,
			})),
			{}
		)
	},

	async down(queryInterface) {
		const [[menu]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE name = 'Unifilar' LIMIT 1"
		)
		if (menu) {
			await queryInterface.bulkDelete('Menu_selecteds', { id_menu: menu.id })
			await queryInterface.bulkDelete('Menus', { id: menu.id })
		}
		await queryInterface.sequelize.query('UPDATE Menus SET `order` = `order` - 1 WHERE `order` > 5')
	},
}
