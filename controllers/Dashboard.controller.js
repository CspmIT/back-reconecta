const { getDashboard } = require('../services/DashboardService')

/**
 * Contadores de las tarjetas del Home, ya calculados.
 *
 * Reemplaza a los tres pedidos que hacia el front cada 10 segundos:
 * /getAllReclosers —que sigue vivo para el tablero del reconectador— y
 * /recloserAlarm y /getAcReclosers, que se borraron. Ver DashboardService.
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
