const { Op, fn, col, literal } = require('sequelize')

// Los DATETIME se guardan en la hora de la sesion MySQL, que en Reconecta es
// -03 (Argentina), asi que se agrupa directo sin convertir. Si algun dia el
// servidor de base pasa a UTC, hay que envolver estas tres expresiones en un
// CONVERT_TZ y ajustar las claves de dia/hora del front.
const DAY = literal('DATE(createdAt)')
const HOUR = literal('HOUR(createdAt)')
const WEEKDAY = literal('WEEKDAY(createdAt)')

/**
 * Rango de fechas de los ultimos N dias.
 *
 * @param {number} days - Cantidad de dias hacia atras.
 * @returns {{ from: Date, to: Date }}
 */
const rangeOf = (days) => {
	const to = new Date()
	const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
	return { from, to }
}

const inRange = (from, to) => ({ createdAt: { [Op.between]: [from, to] } })

/**
 * KPIs de cabecera: sesiones y requests de hoy y del mes, tiempo de respuesta
 * promedio y cantidad de errores del periodo.
 *
 * @param {Object} db - Instancia de la db del tenant.
 * @param {number} days - Dias del periodo seleccionado.
 * @returns {Promise<Object>} Valores listos para las KpiCard.
 */
const getKpis = async (db, days) => {
	const { from, to } = rangeOf(days)
	const startOfDay = new Date()
	startOfDay.setHours(0, 0, 0, 0)
	const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1)

	const [sessionsToday, sessionsMonth, requestsToday, requestsMonth, avg, errors] = await Promise.all([
		db.ActionLog.count({ where: { action: 'LOGIN', createdAt: { [Op.gte]: startOfDay } } }),
		db.ActionLog.count({ where: { action: 'LOGIN', createdAt: { [Op.gte]: startOfMonth } } }),
		db.ApiRequest.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),
		db.ApiRequest.count({ where: { createdAt: { [Op.gte]: startOfMonth } } }),
		db.ApiRequest.findOne({
			attributes: [[fn('AVG', col('ms')), 'avg']],
			where: inRange(from, to),
			raw: true,
		}),
		db.ApiRequest.count({ where: { ...inRange(from, to), status: { [Op.gte]: 400 } } }),
	])

	return {
		sessions_today: sessionsToday,
		sessions_month: sessionsMonth,
		requests_today: requestsToday,
		requests_month: requestsMonth,
		avg_ms: avg?.avg ? Math.round(Number(avg.avg)) : null,
		errors,
	}
}

/**
 * Series temporales del periodo: requests, errores y tiempo de respuesta por
 * dia, mas el perfil por hora y el mapa de calor dia x hora.
 *
 * @param {Object} db - Instancia de la db del tenant.
 * @param {number} days - Dias del periodo.
 * @returns {Promise<Object>} Series agrupadas.
 */
const getTraffic = async (db, days) => {
	const { from, to } = rangeOf(days)

	const [byDay, byHour, heatmap, logins, mqtt] = await Promise.all([
		db.ApiRequest.findAll({
			attributes: [
				[DAY, 'day'],
				[fn('COUNT', col('id')), 'total'],
				[fn('AVG', col('ms')), 'avg_ms'],
				[fn('SUM', literal('status >= 400')), 'errors'],
			],
			where: inRange(from, to),
			group: [DAY],
			order: [[DAY, 'ASC']],
			raw: true,
		}),
		db.ApiRequest.findAll({
			attributes: [
				[HOUR, 'hour'],
				[fn('COUNT', col('id')), 'total'],
				[fn('AVG', col('ms')), 'avg_ms'],
			],
			where: inRange(from, to),
			group: [HOUR],
			order: [[HOUR, 'ASC']],
			raw: true,
		}),
		db.ApiRequest.findAll({
			attributes: [
				[WEEKDAY, 'weekday'],
				[HOUR, 'hour'],
				[fn('COUNT', col('id')), 'total'],
			],
			where: inRange(from, to),
			group: [WEEKDAY, HOUR],
			raw: true,
		}),
		db.ActionLog.findAll({
			attributes: [
				[DAY, 'day'],
				[fn('COUNT', col('id')), 'total'],
			],
			where: { action: 'LOGIN', ...inRange(from, to) },
			group: [DAY],
			order: [[DAY, 'ASC']],
			raw: true,
		}),
		db.ActionLog.findAll({
			attributes: [
				[DAY, 'day'],
				[fn('COUNT', col('id')), 'total'],
			],
			where: { action: 'MQTT_SEND', ...inRange(from, to) },
			group: [DAY],
			order: [[DAY, 'ASC']],
			raw: true,
		}),
	])

	return { by_day: byDay, by_hour: byHour, heatmap, logins_by_day: logins, mqtt_by_day: mqtt }
}

/**
 * Rankings del periodo: modulos, endpoints y usuarios.
 *
 * @param {Object} db - Instancia de la db del tenant.
 * @param {number} days - Dias del periodo.
 * @returns {Promise<Object>} Rankings ya ordenados y acotados.
 */
const getRankings = async (db, days) => {
	const { from, to } = rangeOf(days)
	const where = inRange(from, to)

	const [modules, endpoints, slowest, users, latency, status] = await Promise.all([
		db.ApiRequest.findAll({
			attributes: [
				'module',
				[fn('COUNT', col('id')), 'total'],
				[fn('SUM', col('ms')), 'total_ms'],
				[fn('SUM', literal('status >= 400')), 'errors'],
			],
			where,
			group: ['module'],
			order: [[literal('total'), 'DESC']],
			raw: true,
		}),
		db.ApiRequest.findAll({
			attributes: ['path', [fn('COUNT', col('id')), 'total']],
			where,
			group: ['path'],
			order: [[literal('total'), 'DESC']],
			limit: 10,
			raw: true,
		}),
		db.ApiRequest.findAll({
			attributes: ['path', [fn('AVG', col('ms')), 'avg_ms'], [fn('COUNT', col('id')), 'total']],
			where,
			group: ['path'],
			// Se piden al menos 20 llamadas para que un pico aislado no encabece
			// el ranking de lentos.
			having: literal('COUNT(id) >= 20'),
			order: [[literal('avg_ms'), 'DESC']],
			limit: 10,
			raw: true,
		}),
		db.ApiRequest.findAll({
			attributes: ['id_user', [fn('COUNT', col('ApiRequest.id')), 'total']],
			where: { ...where, id_user: { [Op.ne]: null } },
			// Las columnas del usuario van al GROUP BY: con ONLY_FULL_GROUP_BY
			// activo (default en MySQL 8) no alcanza con agrupar por id_user.
			group: ['id_user', 'user.id', 'user.first_name', 'user.last_name', 'user.email'],
			order: [[literal('total'), 'DESC']],
			limit: 10,
			include: [{ model: db.User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }],
			raw: true,
			nest: true,
		}),
		db.ApiRequest.findAll({
			attributes: [
				[
					literal(
						"CASE WHEN ms < 100 THEN '0-100ms' WHEN ms < 300 THEN '100-300ms' " +
							"WHEN ms < 1000 THEN '300ms-1s' WHEN ms < 3000 THEN '1-3s' ELSE '3s+' END"
					),
					'bucket',
				],
				[fn('COUNT', col('id')), 'total'],
			],
			where,
			group: [literal('bucket')],
			raw: true,
		}),
		db.ApiRequest.findAll({
			attributes: [
				[literal("CONCAT(FLOOR(status / 100), 'xx')"), 'bucket'],
				[fn('COUNT', col('id')), 'total'],
			],
			where,
			group: [literal('bucket')],
			raw: true,
		}),
	])

	return { modules, endpoints, slowest, users, latency, status }
}

/**
 * Errores del periodo, agrupados por endpoint+mensaje y en crudo los ultimos.
 *
 * @param {Object} db - Instancia de la db del tenant.
 * @param {number} days - Dias del periodo.
 * @returns {Promise<Object>} `grouped` y `latest`.
 */
const getErrors = async (db, days) => {
	const { from, to } = rangeOf(days)
	const where = { ...inRange(from, to), status: { [Op.gte]: 400 } }

	const [grouped, latest, byModule] = await Promise.all([
		db.ApiRequest.findAll({
			attributes: [
				'status',
				'method',
				'path',
				'module',
				'error_message',
				[fn('COUNT', col('id')), 'total'],
				[fn('COUNT', fn('DISTINCT', col('id_user'))), 'users'],
				[fn('MAX', col('createdAt')), 'last_seen'],
			],
			where,
			group: ['status', 'method', 'path', 'module', 'error_message'],
			order: [[literal('total'), 'DESC']],
			limit: 20,
			raw: true,
		}),
		db.ApiRequest.findAll({
			attributes: ['id', 'status', 'method', 'path', 'module', 'error_message', 'createdAt'],
			where,
			order: [['createdAt', 'DESC']],
			limit: 20,
			include: [{ model: db.User, as: 'user', attributes: ['first_name', 'last_name', 'email'] }],
			nest: true,
		}),
		db.ApiRequest.findAll({
			attributes: ['module', [fn('COUNT', col('id')), 'total']],
			where,
			group: ['module'],
			order: [[literal('total'), 'DESC']],
			raw: true,
		}),
	])

	return { grouped, latest, by_module: byModule }
}

/**
 * Listado paginado de acciones registradas en `ActionLogs`.
 *
 * @param {Object} db - Instancia de la db del tenant.
 * @param {Object} filters - from, to, search, page y limit.
 * @returns {Promise<{ rows: Array, count: number }>}
 */
const getMovements = async (db, { from, to, search, page = 1, limit = 50 }) => {
	const where = {}
	if (from) where.createdAt = { [Op.gte]: new Date(from) }
	if (to) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(`${to}T23:59:59`) }
	if (search) where.action = { [Op.like]: `%${search}%` }

	return db.ActionLog.findAndCountAll({
		where,
		include: [{ model: db.User, as: 'user', attributes: ['first_name', 'last_name', 'email'] }],
		order: [['createdAt', 'DESC']],
		limit: Number(limit),
		offset: (Number(page) - 1) * Number(limit),
	})
}

module.exports = { getKpis, getTraffic, getRankings, getErrors, getMovements, rangeOf }
