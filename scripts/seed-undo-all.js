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

// Sin argumentos extra => revierte TODOS los seeders (db:seed:undo:all).
// Con --seed <archivo> => revierte solo ese seeder (db:seed:undo) en cada esquema.
//   npm run seed:undo:all
//   npm run seed:undo:all -- --seed 20260530120100-element-types.js
const extraArgs = process.argv.slice(2)
const command = extraArgs.length === 0 ? ['db:seed:undo:all'] : ['db:seed:undo', ...extraArgs]

const args = ['sequelize-cli', ...command, '--env', 'reconecta', '--config', 'config/config.js']

for (const db of names) {
	console.log(`\n=== Reverting seeds on ${db} ===`)
	const result = spawnSync('npx', args, {
		stdio: 'inherit',
		env: { ...process.env, DB_NAME: db },
	})
	if (result.status !== 0) {
		console.error(`\nSeed undo failed on ${db}. Stopping.`)
		process.exit(result.status ?? 1)
	}
}

console.log(`\nAll ${names.length} databases reverted successfully.`)
