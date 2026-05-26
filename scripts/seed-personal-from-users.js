/**
 * Importa los Users activos (status = 1) a la tabla Personal.
 *
 * - first_name/last_name → idem.
 * - rol → description del Profile referenciado por user.profile (cuando exista).
 * - Idempotente: si ya hay un Personal con el mismo first_name+last_name, lo omite.
 *
 * Uso:
 *   DB_NAMES=reconecta_adeco,reconecta_foo node scripts/seed-personal-from-users.js
 *   # o para una sola base:
 *   DB_NAME=reconecta_adeco node scripts/seed-personal-from-users.js
 */
require('dotenv').config()
const { getTenantDb } = require('../models')
const { capitalizeNombre } = require('../services/PersonalService')

const dbNames = (process.env.DB_NAMES || process.env.DB_NAME || '')
	.split(',')
	.map((n) => n.trim())
	.filter(Boolean)

if (dbNames.length === 0) {
	console.error(
		'Definí DB_NAMES (lista separada por comas) o DB_NAME en .env antes de correr el script.',
	)
	process.exit(1)
}

const seedPersonalFromUsers = async (dbName) => {
	console.log(`\n=== ${dbName} ===`)
	const db = await getTenantDb(dbName)

	const users = await db.User.findAll({ where: { status: 1 } })
	const profiles = await db.Profile.findAll()
	const profileById = new Map(profiles.map((p) => [p.id, p.description]))

	let created = 0
	let skipped = 0

	for (const u of users) {
		const first_name = capitalizeNombre(u.first_name)
		const last_name = capitalizeNombre(u.last_name)
		if (!first_name || !last_name) {
			console.warn(`  · skip user id=${u.id}: faltan nombre y/o apellido`)
			skipped++
			continue
		}

		const existing = await db.Personal.findOne({
			where: { first_name, last_name },
		})
		if (existing) {
			console.log(`  · skip (ya existe): ${first_name} ${last_name}`)
			skipped++
			continue
		}

		const rol = profileById.get(u.profile) || null
		await db.Personal.create({ first_name, last_name, rol })
		console.log(`  ✓ creado: ${first_name} ${last_name} (rol=${rol ?? 'null'})`)
		created++
	}

	console.log(`  → ${created} creados, ${skipped} omitidos (de ${users.length} users activos).`)
	await db.sequelize.close()
}

;(async () => {
	try {
		for (const dbName of dbNames) {
			await seedPersonalFromUsers(dbName)
		}
		console.log('\nListo.')
		process.exit(0)
	} catch (e) {
		console.error('\nFalló el script:', e)
		process.exit(1)
	}
})()
