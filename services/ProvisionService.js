const path = require('node:path')
const { spawn } = require('node:child_process')
const mysql = require('mysql2/promise')

const ROOT = path.join(__dirname, '..')
const CLI = require.resolve('sequelize-cli/lib/sequelize')
const STEP_TIMEOUT_MS = 5 * 60 * 1000
const LOG_TAIL = 4000

// Mismo criterio que los nombres de schema existentes (reconecta_adeco, ...).
// Se valida antes de interpolarlo en el CREATE DATABASE.
const SCHEMA_RE = /^[a-zA-Z0-9_]{1,64}$/

// Evita que dos altas del mismo schema corran en paralelo.
const running = new Set()

class ProvisionError extends Error {
	constructor(message, status, log) {
		super(message)
		this.status = status
		this.log = log
	}
}

const connect = (database) =>
	mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASS,
		port: process.env.DB_PORT || 3306,
		database,
	})

/**
 * Corre un comando de sequelize-cli contra el schema indicado, igual que
 * scripts/migrate-all.js, pero sin bloquear el event loop.
 *
 * @param {string[]} command - Ej: ['db:migrate'].
 * @param {string} schema - Schema destino.
 * @returns {Promise<string>} Salida combinada del proceso.
 */
const runCli = (command, schema) =>
	new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [CLI, ...command, '--env', 'reconecta', '--config', 'config/config.js'], {
			cwd: ROOT,
			env: { ...process.env, DB_NAME: schema },
		})
		let output = ''
		child.stdout.on('data', (d) => (output += d))
		child.stderr.on('data', (d) => (output += d))

		const timer = setTimeout(() => child.kill('SIGTERM'), STEP_TIMEOUT_MS)
		child.on('error', (err) => {
			clearTimeout(timer)
			reject(new ProvisionError(err.message, 500, output))
		})
		child.on('close', (code, signal) => {
			clearTimeout(timer)
			if (code === 0) return resolve(output)
			const reason = signal ? `cortado por timeout (${signal})` : `salio con codigo ${code}`
			reject(new ProvisionError(`${command[0]} fallo en ${schema}: ${reason}`, 500, output.slice(-LOG_TAIL)))
		})
	})

/**
 * Da de alta el schema de un cliente nuevo: crea la base si no existe, corre
 * todas las migraciones y todos los seeders pendientes.
 *
 * Es idempotente: sequelize-cli lleva el registro en SequelizeMeta y
 * SequelizeData, asi que repetir la llamada solo aplica lo que falte.
 *
 * @param {string} schema - Nombre del schema nuevo.
 * @returns {Promise<Object>} Resumen del proceso.
 * @throws {ProvisionError} Con `status` HTTP y `log` del paso que fallo.
 */
const provisionSchema = async (schema) => {
	if (typeof schema !== 'string' || !SCHEMA_RE.test(schema)) {
		throw new ProvisionError('Nombre de schema invalido: solo letras, numeros y guion bajo (max 64)', 400)
	}
	if (running.has(schema)) {
		throw new ProvisionError(`Ya hay un alta en curso para ${schema}`, 409)
	}

	running.add(schema)
	try {
		const conn = await connect()
		let created
		try {
			const [rows] = await conn.query('SELECT 1 FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?', [schema])
			created = rows.length === 0
			if (created) {
				await conn.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
			}
		} finally {
			await conn.end()
		}

		const migrateLog = await runCli(['db:migrate'], schema)
		const seedLog = await runCli(['db:seed:all'], schema)

		return {
			schema,
			created,
			migrations: migrateLog.match(/^== .*: migrated/gm)?.map((l) => l.slice(3, l.indexOf(':'))) ?? [],
			seeders: seedLog.match(/^== .*: migrated/gm)?.map((l) => l.slice(3, l.indexOf(':'))) ?? [],
		}
	} finally {
		running.delete(schema)
	}
}

module.exports = { provisionSchema, ProvisionError }
