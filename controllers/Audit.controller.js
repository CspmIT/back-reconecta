const { getKpis, getTraffic, getRankings, getErrors, getMovements } = require('../services/AuditService')
const { resolveTargets, listSchemas, SUPERADMIN_PROFILE } = require('../utils/auditTenants')
const { mergeDashboards } = require('../utils/auditMerge')

// Rangos habilitados en el filtro del dashboard.
const ALLOWED_DAYS = [7, 30, 90]

const parseDays = (value) => {
	const days = Number(value)
	return ALLOWED_DAYS.includes(days) ? days : 7
}

/**
 * Corre las cuatro consultas del tablero sobre una base.
 *
 * @param {Object} db - Instancia de la db del tenant.
 * @param {number} days - Dias del periodo.
 * @returns {Promise<Object>} kpis, traffic, rankings y errors.
 */
const dashboardOf = async (db, days) => {
	const [kpis, traffic, rankings, errors] = await Promise.all([
		getKpis(db, days),
		getTraffic(db, days),
		getRankings(db, days),
		getErrors(db, days),
	])
	return { kpis, traffic, rankings, errors }
}

const fail = (res, error) => res.status(error.status || 500).json({ message: error.message })

/**
 * Devuelve todo lo que necesita el dashboard en una sola llamada.
 *
 * Acepta `schema` para mirar otra cooperativa, o `schema=all` para la vista
 * global; ambas cosas quedan reservadas al perfil Super Admin.
 */
const getDashboard = async (req, res) => {
	try {
		const days = parseDays(req.query.days)
		const { targets, scope } = await resolveTargets(req)

		// La vista global siempre responde con la forma agregada, aunque hoy haya
		// una sola cooperativa con auditoría instalada: si no, el front pediría
		// 'todas' y recibiría el tablero de una, sin los cortes por organización.
		if (scope !== 'all' && targets.length === 1) {
			const dashboard = await dashboardOf(targets[0].db, days)
			return res.status(200).json({ days, scope, schema: targets[0].schema, ...dashboard })
		}

		// Una cooperativa caida no puede dejar sin tablero a las demas: se
		// informa cuales quedaron afuera y se agrega con el resto.
		const settled = await Promise.allSettled(
			targets.map(async ({ schema, db }) => ({ schema, dashboard: await dashboardOf(db, days) }))
		)
		const parts = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value)
		const skipped = targets
			.filter((_, i) => settled[i].status === 'rejected')
			.map(({ schema }) => schema)

		if (!parts.length) {
			return res.status(502).json({ message: 'No se pudo leer la auditoría de ninguna cooperativa' })
		}

		return res.status(200).json({
			days,
			scope,
			schemas: parts.map((p) => p.schema),
			skipped,
			...mergeDashboards(parts),
		})
	} catch (error) {
		return fail(res, error)
	}
}

/**
 * Listado paginado de acciones para la pestaña de Movimientos.
 */
const getMovementsList = async (req, res) => {
	try {
		const { from, to, search, page, limit } = req.query
		const { targets, scope } = await resolveTargets(req)

		if (scope !== 'all' && targets.length === 1) {
			const { rows, count } = await getMovements(targets[0].db, { from, to, search, page, limit })
			return res.status(200).json({ rows, count, scope })
		}

		// En la vista global se pide el mismo tope a cada cooperativa y se ordena
		// el conjunto: alcanza para auditar y evita paginar contra N bases.
		const settled = await Promise.allSettled(
			targets.map(async ({ schema, db }) => {
				const { rows, count } = await getMovements(db, { from, to, search, page: 1, limit })
				return { schema, rows, count }
			})
		)
		const parts = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value)

		const rows = parts
			.flatMap(({ schema, rows: list }) => list.map((row) => ({ ...row.toJSON(), schema })))
			.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
			.slice(0, Number(limit) || 50)

		return res.status(200).json({
			rows,
			count: parts.reduce((sum, part) => sum + part.count, 0),
			scope,
			skipped: targets.filter((_, i) => settled[i].status === 'rejected').map(({ schema }) => schema),
		})
	} catch (error) {
		return fail(res, error)
	}
}

/**
 * Cooperativas que el usuario puede consultar. El front arma el selector con
 * los nombres que le da Cooptech; esto le dice cuales tienen auditoría y si
 * tiene permiso para cambiar de cooperativa.
 */
const getOrganizations = async (req, res) => {
	try {
		const isSuperadmin = req.user.profile === SUPERADMIN_PROFILE
		if (!isSuperadmin) {
			return res.status(200).json({ superadmin: false, own: req.user.schema, schemas: [req.user.schema] })
		}
		const schemas = await listSchemas(req.db)
		return res.status(200).json({
			superadmin: true,
			own: req.user.schema,
			schemas: schemas.includes(req.user.schema) ? schemas : [req.user.schema, ...schemas],
		})
	} catch (error) {
		return fail(res, error)
	}
}

module.exports = { getDashboard, getMovementsList, getOrganizations }
