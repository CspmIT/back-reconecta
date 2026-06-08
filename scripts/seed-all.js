require('dotenv').config()
const { spawnSync } = require('node:child_process')

const names = (process.env.DB_NAMES || '')
	.split(',')
	.map((n) => n.trim())
	.filter(Boolean)

if (names.length === 0) {
	console.error('DB_NAMES is empty. Set a comma-separated list in .env, e.g. DB_NAMES=reconecta_adeco,reconecta_foo')
	process.exit(1)
}

// Sin argumentos extra => corre TODOS los seeders (db:seed:all).
// Con --seed <archivo> => corre solo ese seeder (db:seed) en cada esquema.
//   npm run seed:all
//   npm run seed:all -- --seed 20260530120100-element-types.js
const extraArgs = process.argv.slice(2)
const command = extraArgs.length === 0 ? ['db:seed:all'] : ['db:seed', ...extraArgs]

const args = ['sequelize-cli', ...command, '--env', 'reconecta', '--config', 'config/config.js']

for (const db of names) {
	console.log(`\n=== Seeding ${db} ===`)
	const result = spawnSync('npx', args, {
		stdio: 'inherit',
		env: { ...process.env, DB_NAME: db },
	})
	if (result.status !== 0) {
		console.error(`\nSeeding failed on ${db}. Stopping.`)
		process.exit(result.status ?? 1)
	}
}

console.log(`\nAll ${names.length} databases seeded successfully.`)
