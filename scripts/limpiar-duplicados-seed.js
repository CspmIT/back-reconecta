require('dotenv').config()
const mysql = require('mysql2/promise')

/**
 * Limpieza puntual: borra las filas que duplicó el `npm run seed:all` del
 * 2026-09-09 en reconecta_desarrollo.
 *
 * Contexto: los seeders viejos ya se habían corrido a mano, pero no estaban
 * registrados en SequelizeData (la tabla de tracking se activó después). Al
 * correr `seed:all` sin haber corrido antes `seed:backfill`, sequelize-cli los
 * consideró pendientes y los reinsertó. Cortó solo cuando llegó a
 * element-types, que tiene ids explícitos y chocó contra la clave primaria.
 *
 * Los rangos de id y las cantidades salen de una verificación previa: las 370
 * filas son duplicados de contenido de filas anteriores y ninguna está
 * referenciada por otra tabla. Se conservan siempre las originales (id menor),
 * así no se pierde nada que se haya editado después desde la aplicación.
 *
 * Uso:
 *   node scripts/limpiar-duplicados-seed.js --dry-run   # solo cuenta
 *   node scripts/limpiar-duplicados-seed.js             # borra
 */

// Orden importante: los hijos antes que los padres.
const LOTES = [
	{ tabla: 'Menu_selecteds', min: 92, max: 131, esperado: 40 },
	{ tabla: 'Menus', min: 25, max: 34, esperado: 10 },
	{ tabla: 'ColumnsTables', min: 61, max: 90, esperado: 30 },
	{ tabla: 'Tables', min: 13, max: 18, esperado: 6 },
	{ tabla: 'ControlsModels', min: 129, max: 192, esperado: 64 },
	{ tabla: 'Controls', min: 111, max: 165, esperado: 55 },
	{ tabla: 'EquipmentModels', min: 20, max: 28, esperado: 9 },
	{ tabla: 'Versions', min: 15, max: 17, esperado: 3 },
	{ tabla: 'Brands', min: 9, max: 10, esperado: 2 },
	{ tabla: 'Profiles', min: 9, max: 12, esperado: 4 },
	{ tabla: 'Users', min: 7, max: 8, esperado: 2 },
	{ tabla: 'Variables', min: 291, max: 435, esperado: 145 },
]

const FECHA = '2026-09-09'
const BASE_ESPERADA = 'reconecta_desarrollo'
const dryRun = process.argv.includes('--dry-run')

;(async () => {
	if (process.env.DB_NAME !== BASE_ESPERADA) {
		console.error(`Esta limpieza es solo para ${BASE_ESPERADA} y DB_NAME es "${process.env.DB_NAME}". Se aborta.`)
		process.exit(1)
	}

	const conn = await mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASS,
		database: process.env.DB_NAME,
	})

	if (dryRun) {
		for (const { tabla, min, max, esperado } of LOTES) {
			const [rows] = await conn.query(
				`SELECT COUNT(*) AS n FROM \`${tabla}\` WHERE id BETWEEN ? AND ? AND DATE(createdAt) = ?`,
				[min, max, FECHA]
			)
			const n = Number(rows[0].n)
			console.log(`${tabla}: ${n} filas a borrar ${n === esperado ? '(ok)' : `(¡esperaba ${esperado}!)`}`)
		}
		await conn.end()
		return
	}

	await conn.beginTransaction()
	try {
		let total = 0
		for (const { tabla, min, max, esperado } of LOTES) {
			const [res] = await conn.query(
				`DELETE FROM \`${tabla}\` WHERE id BETWEEN ? AND ? AND DATE(createdAt) = ?`,
				[min, max, FECHA]
			)
			// Si la cantidad no coincide con lo verificado, algo cambió desde el
			// análisis: mejor no borrar nada.
			if (res.affectedRows !== esperado) {
				throw new Error(`${tabla}: iba a borrar ${res.affectedRows} y esperaba ${esperado}`)
			}
			console.log(`${tabla}: ${res.affectedRows} filas borradas`)
			total += res.affectedRows
		}
		await conn.commit()
		console.log(`\nListo: ${total} filas duplicadas eliminadas.`)
	} catch (e) {
		await conn.rollback()
		console.error(`\nROLLBACK, no se borró nada: ${e.message}`)
		process.exitCode = 1
	} finally {
		await conn.end()
	}
})()
