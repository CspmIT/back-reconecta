'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		const date = new Date()

		// El id del menú Configuración se busca por nombre: los ids de Menus no
		// son iguales en todas las cooperativas.
		const [[parent]] = await queryInterface.sequelize.query(
			"SELECT id, group_menu FROM Menus WHERE name = 'Configuración' AND sub_menu IS NULL LIMIT 1"
		)
		if (!parent) {
			console.log('No existe el menú Configuración: se omite el alta de API externa.')
			return
		}

		const [[existing]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE link = 'config/externalApi' LIMIT 1"
		)
		if (existing) {
			console.log('El menú API externa ya existe: no se vuelve a insertar.')
			return
		}

		const [[last]] = await queryInterface.sequelize.query('SELECT MAX(`order`) AS max_order FROM Menus')

		await queryInterface.bulkInsert('Menus', [
			{
				name: 'API externa',
				link: 'config/externalApi',
				icon: 'FaKey',
				level: '2',
				group_menu: parent.group_menu,
				sub_menu: parent.id,
				status: '1',
				order: Number(last?.max_order || 0) + 1,
				createdAt: date,
				updatedAt: date,
			},
		])

		const [[menu]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE link = 'config/externalApi' LIMIT 1"
		)

		// Un token da acceso a los datos de la cooperativa a un tercero, asi que
		// arranca habilitado solo para Moderador y Super Admin. Se busca por
		// descripcion y no por id: hay bases con los perfiles duplicados con otros
		// ids. El resto queda en 0 y se habilita desde Accesos si hace falta.
		const PERFILES_HABILITADOS = ['Moderador', 'Super Admin']

		const profiles = await queryInterface.sequelize.query('SELECT id, description FROM Profiles', {
			type: queryInterface.sequelize.QueryTypes.SELECT,
		})

		await queryInterface.bulkInsert(
			'Menu_selecteds',
			profiles.map((profile) => ({
				id_menu: menu.id,
				id_profile: profile.id,
				id_user: null,
				status: PERFILES_HABILITADOS.includes(profile.description) ? 1 : 0,
				createdAt: date,
				updatedAt: date,
			}))
		)
	},

	async down(queryInterface) {
		const [[menu]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE link = 'config/externalApi' LIMIT 1"
		)
		if (!menu) return
		await queryInterface.bulkDelete('Menu_selecteds', { id_menu: menu.id })
		await queryInterface.bulkDelete('Menus', { id: menu.id })
	},
}
