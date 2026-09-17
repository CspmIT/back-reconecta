'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		const date = new Date()

		// El item puede existir ya como el placeholder "Hardware" (Configuracion
		// Multivac / En desarrollo) o no existir en absoluto: en los seeders del
		// repo no esta, pero si en bases viejas. Se busca por las dos formas del
		// link porque algunas coops lo tienen con barra inicial.
		const [[existing]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE link IN ('config/hardware', '/config/hardware') LIMIT 1"
		)

		let menuId = existing?.id
		if (menuId) {
			// Renombrado + normalizacion del link: la ruta /config/hardware ahora
			// es AutonomIA.
			await queryInterface.sequelize.query(
				"UPDATE Menus SET name = 'AutonomIA', link = 'config/hardware', icon = 'GrConfigure', updatedAt = NOW() WHERE id = ?",
				{ replacements: [menuId] }
			)
			console.log('Menú config/hardware renombrado a AutonomIA.')
		} else {
			const [[parent]] = await queryInterface.sequelize.query(
				"SELECT id, group_menu FROM Menus WHERE name = 'Configuración' AND sub_menu IS NULL LIMIT 1"
			)
			if (!parent) {
				console.log('No existe el menú Configuración: se omite el alta de AutonomIA.')
				return
			}

			const [[last]] = await queryInterface.sequelize.query('SELECT MAX(`order`) AS max_order FROM Menus')

			await queryInterface.bulkInsert('Menus', [
				{
					name: 'AutonomIA',
					link: 'config/hardware',
					icon: 'GrConfigure',
					level: '2',
					group_menu: parent.group_menu,
					sub_menu: parent.id,
					status: '1',
					order: Number(last?.max_order || 0) + 1,
					createdAt: date,
					updatedAt: date,
				},
			])

			const [[creado]] = await queryInterface.sequelize.query(
				"SELECT id FROM Menus WHERE link = 'config/hardware' LIMIT 1"
			)
			menuId = creado.id
		}

		// Habilitado para todos los perfiles: el instalador es el usuario
		// objetivo. Se ajusta por cooperativa desde Configuración → Accesos.
		// Solo se insertan los perfiles que todavia no tienen el permiso, para
		// no duplicar filas si el item ya existia con accesos cargados.
		const faltantes = await queryInterface.sequelize.query(
			'SELECT p.id FROM Profiles p WHERE NOT EXISTS (SELECT 1 FROM Menu_selecteds ms WHERE ms.id_menu = ? AND ms.id_profile = p.id)',
			{ replacements: [menuId], type: queryInterface.sequelize.QueryTypes.SELECT }
		)
		if (!faltantes.length) return

		await queryInterface.bulkInsert(
			'Menu_selecteds',
			faltantes.map((profile) => ({
				id_menu: menuId,
				id_profile: profile.id,
				id_user: null,
				status: 1,
				createdAt: date,
				updatedAt: date,
			}))
		)
	},

	async down(queryInterface) {
		// Se borra el item y sus accesos, igual que el seeder de notificaciones.
		// El "Hardware" que habia antes era un placeholder sin vista propia, asi
		// que no se intenta reconstruirlo: si hace falta, se vuelve a correr up().
		const [[menu]] = await queryInterface.sequelize.query(
			"SELECT id FROM Menus WHERE link = 'config/hardware' LIMIT 1"
		)
		if (!menu) return
		await queryInterface.bulkDelete('Menu_selecteds', { id_menu: menu.id })
		await queryInterface.bulkDelete('Menus', { id: menu.id })
	},
}
