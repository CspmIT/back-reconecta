const { getKpis, getTraffic, getRankings, getErrors, getMovements } = require('../services/AuditService')

// Rangos habilitados en el filtro del dashboard.
const ALLOWED_DAYS = [7, 30, 90]

const parseDays = (value) => {
	const days = Number(value)
	return ALLOWED_DAYS.includes(days) ? days : 7
}

/**
 * Devuelve todo lo que necesita el dashboard en una sola llamada: KPIs, series
 * de trafico, rankings y errores del periodo.
 */
const getDashboard = async (req, res) => {
	try {
		const days = parseDays(req.query.days)
		const [kpis, traffic, rankings, errors] = await Promise.all([
			getKpis(req.db, days),
			getTraffic(req.db, days),
			getRankings(req.db, days),
			getErrors(req.db, days),
		])
		return res.status(200).json({ days, kpis, traffic, rankings, errors })
	} catch (error) {
		return res.status(500).json({ message: error.message })
	}
}

/**
 * Listado paginado de acciones para la pestaña de Movimientos.
 */
const getMovementsList = async (req, res) => {
	try {
		const { from, to, search, page, limit } = req.query
		const { rows, count } = await getMovements(req.db, { from, to, search, page, limit })
		return res.status(200).json({ rows, count })
	} catch (error) {
		return res.status(500).json({ message: error.message })
	}
}

module.exports = { getDashboard, getMovementsList }
