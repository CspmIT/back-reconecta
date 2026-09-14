'use strict'

/*
 * Invierte la semantica de los filtros por tipo: antes se guardaba lo silenciado
 * (muted_alarm_types / muted_device_types) y ahora se guarda lo que si notifica
 * (alarm_types / device_types), que es lo que el usuario elige en la pantalla.
 *
 * Los datos existentes se pasan al complemento para que nadie cambie de
 * comportamiento por la migracion: lo que no estaba silenciado queda activo.
 * null sigue significando "todo activo" (usuario que nunca configuro nada).
 *
 * muted_devices y muted_events no se tocan: ahi la seleccion sigue siendo por
 * excepcion (todos los equipos nacen con la alarma activa y el usuario apaga los
 * que no quiere, con la campana de la tabla general).
 */

const ALARM_TYPES = ['Evento', 'Deadman']
const DEVICE_TYPES = ['Reconectador', 'Medidor', 'Analizador']

// MySQL devuelve JSON ya parseado o como string segun version del driver.
const parseList = (value) => {
	if (Array.isArray(value)) return value
	if (typeof value !== 'string' || !value) return null
	try {
		const parsed = JSON.parse(value)
		return Array.isArray(parsed) ? parsed : null
	} catch {
		return null
	}
}

const complement = (all, saved) => {
	const list = parseList(saved)
	if (list === null) return null
	return all.filter((item) => !list.includes(item))
}

const COLUMNS = [
	{ from: 'muted_alarm_types', to: 'alarm_types', all: ALARM_TYPES },
	{ from: 'muted_device_types', to: 'device_types', all: DEVICE_TYPES },
]

const invert = async (queryInterface, columns) => {
	const [rows] = await queryInterface.sequelize.query(
		`SELECT id, ${columns.map((c) => c.name).join(', ')} FROM NotificationPrefs`
	)

	for (const row of rows) {
		const sets = []
		const values = []
		for (const column of columns) {
			const inverted = complement(column.all, row[column.name])
			sets.push(`${column.name} = ?`)
			values.push(inverted === null ? null : JSON.stringify(inverted))
		}
		await queryInterface.sequelize.query(`UPDATE NotificationPrefs SET ${sets.join(', ')} WHERE id = ?`, {
			replacements: [...values, row.id],
		})
	}
}

module.exports = {
	async up(queryInterface) {
		for (const column of COLUMNS) {
			await queryInterface.renameColumn('NotificationPrefs', column.from, column.to)
		}
		await invert(
			queryInterface,
			COLUMNS.map((column) => ({ name: column.to, all: column.all }))
		)
	},

	async down(queryInterface) {
		await invert(
			queryInterface,
			COLUMNS.map((column) => ({ name: column.to, all: column.all }))
		)
		for (const column of COLUMNS) {
			await queryInterface.renameColumn('NotificationPrefs', column.to, column.from)
		}
	},
}
