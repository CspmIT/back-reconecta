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
			console.log('No existe el menú Configuración: se omite el alta de Auditoría.')
			return
		}

		const [[existing]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE link = 'config/audit' LIMIT 1"
		)
		if (existing) {
			console.log('El menú Auditoría ya existe: no se vuelve a insertar.')
			return
		}

		const [[last]] = await queryInterface.sequelize.query('SELECT MAX(`order`) AS max_order FROM Menus')

		await queryInterface.bulkInsert('Menus', [
			{
				name: 'Auditoría',
				link: 'config/audit',
				icon: 'MdHistory',
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
			"SELECT id FROM Menus WHERE link = 'config/audit' LIMIT 1"
		)

		// Perfiles que arrancan viendo el modulo: 1 (Moderador) audita su propia
		// cooperativa y 4 (Super Admin) es ademas el unico que puede cambiar de
		// cooperativa, control que aplica el backend en utils/auditTenants.js.
		// El resto queda en 0 y se habilita desde Accesos si hace falta.
		const PERFILES_HABILITADOS = [1, 4]

		const profiles = await queryInterface.sequelize.query('SELECT id FROM Profiles', {
			type: queryInterface.sequelize.QueryTypes.SELECT,
		})

		await queryInterface.bulkInsert(
			'Menu_selecteds',
			profiles.map((profile) => ({
				id_menu: menu.id,
				id_profile: profile.id,
				id_user: null,
				status: PERFILES_HABILITADOS.includes(profile.id) ? 1 : 0,
				createdAt: date,
				updatedAt: date,
			}))
		)
	},

	async down(queryInterface) {
		const [[menu]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE link = 'config/audit' LIMIT 1"
		)
		if (!menu) return
		await queryInterface.bulkDelete('Menu_selecteds', { id_menu: menu.id })
		await queryInterface.bulkDelete('Menus', { id: menu.id })
	},
}
