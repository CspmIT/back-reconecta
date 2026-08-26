const {
	getLines,
	getLine,
	saveLine,
	updateLine,
	removeLine,
	getElementUsage,
} = require('../services/MapLineService')
const { getMapLive } = require('../services/MapLiveService')

/**
 * Vista por defecto del mapa. Hay un solo mapa, asi que se devuelve un objeto
 * y no un array como el viejo /getDataMap.
 */
const getMapConfig = async (req, res) => {
	try {
		const map = await req.db.MapLocation.findOne({
			where: { status: 1 },
			order: [['id', 'ASC']],
		})
		if (!map) {
			return res.status(404).json({ message: 'No hay una vista de mapa configurada' })
		}
		return res.status(200).json({
			id: map.id,
			name: map.name,
			center: [parseFloat(map.lat_location), parseFloat(map.lng_location)],
			zoom: map.zoom,
		})
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const editMapConfig = async (req, res) => {
	try {
		const { center, zoom, name } = req.body
		const map = await req.db.MapLocation.findOne({ where: { status: 1 }, order: [['id', 'ASC']] })
		if (!map) return res.status(404).json({ message: 'No hay una vista de mapa configurada' })

		const cambios = {}
		if (Array.isArray(center) && center.length === 2) {
			cambios.lat_location = center[0]
			cambios.lng_location = center[1]
		}
		if (zoom !== undefined) cambios.zoom = zoom
		if (name !== undefined) cambios.name = name
		await map.update(cambios)
		return res.status(200).json({ message: 'Vista del mapa actualizada' })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const listLines = async (req, res) => {
	try {
		if (req.params.id) {
			const line = await getLine(req.db, req.params.id)
			if (!line) return res.status(404).json({ message: 'Tramo no encontrado' })
			return res.status(200).json(line)
		}
		return res.status(200).json(await getLines(req.db))
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addLine = async (req, res) => {
	try {
		const data = await saveLine(req.db, req.body)
		return res.status(200).json({ message: 'Tramo creado correctamente', data })
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

const editLine = async (req, res) => {
	try {
		const data = await updateLine(req.db, req.params.id, req.body)
		return res.status(200).json({ message: 'Tramo modificado correctamente', data })
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

const deleteLine = async (req, res) => {
	try {
		const data = await removeLine(req.db, req.params.id)
		return res.status(200).json({ message: 'Tramo eliminado correctamente', data })
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

/**
 * Tramos que dependen de un elemento. El ABM lo consulta antes de borrar para
 * avisar en vez de chocar contra el ON DELETE RESTRICT.
 */
const listElementUsage = async (req, res) => {
	try {
		const lines = await getElementUsage(req.db, req.params.id)
		return res.status(200).json({ id_element: Number(req.params.id), lines })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const liveData = async (req, res) => {
	try {
		const { data, skipped } = await getMapLive(req.db, req.user.influx_name)
		if (skipped.length) {
			console.warn('GET /map/live: equipos con marca/serial invalido omitidos ->', JSON.stringify(skipped))
		}
		return res.status(200).json(data)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	getMapConfig,
	editMapConfig,
	listLines,
	addLine,
	editLine,
	deleteLine,
	listElementUsage,
	liveData,
}
