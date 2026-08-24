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

const extraArgs = process.argv.slice(2)
if (extraArgs.length === 0) {
	console.error('Missing migration name. Usage: npm run migrate:undo:all -- --name 20250325104442-create-binnacle.js')
	process.exit(1)
}

const args = ['sequelize-cli', 'db:migrate:undo', '--env', 'reconecta', '--config', 'config/config.js', ...extraArgs]

for (const db of names) {
	console.log(`\n=== Reverting on ${db} ===`)
	const result = spawnSync('npx', args, {
		stdio: 'inherit',
		env: { ...process.env, DB_NAME: db },
	})
	if (result.status !== 0) {
		console.error(`\nUndo failed on ${db}. Stopping.`)
		process.exit(result.status ?? 1)
	}
}

console.log(`\nAll ${names.length} databases reverted successfully.`)
