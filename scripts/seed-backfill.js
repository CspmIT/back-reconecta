require('dotenv').config()
const fs = require('node:fs')
const path = require('node:path')
const mysql = require('mysql2/promise')

/**
 * Marca los seeders existentes como YA aplicados en la tabla de tracking
 * (SequelizeData), SIN ejecutarlos.
 *
 * Se corre UNA sola vez por esquema que YA tiene los datos sembrados, justo
 * después de activar `seederStorage: 'sequelize'`. Evita que el próximo
 * `seed:all` los reinserte (y duplique).
 *
 * Esquemas objetivo: DB_NAMES (lista separada por comas) o, si está vacío, DB_NAME.
 *
 * Uso:
 *   node scripts/seed-backfill.js          # marca TODOS los seeders del directorio
 *   npm run seed:backfill
 */

const SEEDERS_DIR = path.join(__dirname, '..', 'seeders')
const TABLE = 'SequelizeData'

const names = (process.env.DB_NAMES || '')
	.split(',')
	.map((n) => n.trim())
	.filter(Boolean)

const targets = names.length > 0 ? names : process.env.DB_NAME ? [process.env.DB_NAME] : []

if (targets.length === 0) {
	console.error('No hay esquemas objetivo. Definí DB_NAMES (lista) o DB_NAME en .env.')
	process.exit(1)
}

const seederFiles = fs
	.readdirSync(SEEDERS_DIR)
	.filter((f) => f.endsWith('.js'))
	.sort()

if (seederFiles.length === 0) {
	console.error(`No se encontraron seeders en ${SEEDERS_DIR}.`)
	process.exit(1)
}

;(async () => {
	for (const db of targets) {
		const conn = await mysql.createConnection({
			host: process.env.DB_HOST,
			user: process.env.DB_USER,
			password: process.env.DB_PASS,
			database: db,
			port: process.env.DB_PORT || 3306,
		})
		console.log(`\n=== ${db} ===`)
		// Misma estructura que crea sequelize-cli para el storage de seeders.
		await conn.query(`CREATE TABLE IF NOT EXISTS \`${TABLE}\` (name VARCHAR(255) NOT NULL UNIQUE)`)

		const [rows] = await conn.query(`SELECT name FROM \`${TABLE}\``)
		const already = new Set(rows.map((r) => r.name))

		const missing = seederFiles.filter((f) => !already.has(f))
		if (missing.length === 0) {
			console.log('  Ya estaba todo registrado, nada que hacer.')
		} else {
			await conn.query(`INSERT INTO \`${TABLE}\` (name) VALUES ${missing.map(() => '(?)').join(',')}`, missing)
			console.log(`  Registrados ${missing.length} seeders como aplicados:`)
			missing.forEach((f) => console.log(`    + ${f}`))
		}
		await conn.end()
	}
	console.log(`\nBackfill completado en ${targets.length} esquema(s).`)
})().catch((e) => {
	console.error('ERR', e.message)
	process.exit(1)
})
