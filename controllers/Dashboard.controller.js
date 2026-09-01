const { getDashboard } = require('../services/DashboardService')

/**
 * Contadores de las tarjetas del Home, ya calculados.
 *
 * Reemplaza a los tres pedidos que hacia el front (/getAllReclosers,
 * /recloserAlarm y /getAcReclosers) cada 10 segundos; ver DashboardService.
 */
const dashboardCounters = async (req, res) => {
	try {
		const data = await getDashboard(req.db, req.user.influx_name)
		return res.status(200).json(data)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	dashboardCounters,
}
