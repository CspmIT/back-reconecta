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
 * Valida el encuadre que manda el front. Devuelve los campos listos para el
 * modelo o lanza con un mensaje para el usuario. `parcial` permite omitir
 * campos (PATCH); en el alta son todos obligatorios salvo el nombre.
 */
const leerVista = ({ center, zoom, name }, parcial = false) => {
	const campos = {}
	if (center !== undefined || !parcial) {
		const [lat, lng] = Array.isArray(center) ? center.map(Number) : []
		if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
			throw new Error('El centro debe ser [lat, lng] con coordenadas validas')
		}
		campos.lat_location = lat
		campos.lng_location = lng
	}
	if (zoom !== undefined || !parcial) {
		const z = Number(zoom)
		if (!Number.isFinite(z) || z < 0 || z > 22) throw new Error('El zoom debe ser un numero entre 0 y 22')
		campos.zoom = z
	}
	if (name !== undefined) {
		const limpio = String(name).trim()
		if (!limpio) throw new Error('El nombre no puede quedar vacio')
		campos.name = limpio
	}
	return campos
}

const vistaActiva = (db) => db.MapLocation.findOne({ where: { status: 1 }, order: [['id', 'ASC']] })

/**
 * Elementos que ya tienen coordenadas. La pantalla de alta los dibuja como
 * referencia mientras se encuadra la vista.
 */
const elementosUbicados = async (db) => {
	const { Op } = db.Sequelize
	const filas = await db.Element.findAll({
		attributes: ['id', 'name', 'type', 'lat', 'lon'],
		where: { status: 1, lat: { [Op.ne]: null }, lon: { [Op.ne]: null } },
		raw: true,
	})
	return filas
		.map((e) => ({ id: e.id, name: e.name, type: e.type, lat: parseFloat(e.lat), lon: parseFloat(e.lon) }))
		.filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon))
}

const formatoVista = (map) => ({
	id: map.id,
	name: map.name,
	center: [parseFloat(map.lat_location), parseFloat(map.lng_location)],
	zoom: map.zoom,
})

/**
 * Vista por defecto del mapa. Hay un solo mapa, asi que se devuelve un objeto
 * y no un array como el viejo /getDataMap.
 *
 * Sin vista cargada responde 404 con `code: 'NO_MAP'` para que el front ofrezca
 * el alta en lugar de mostrar un error, con los elementos ya ubicados.
 */
const getMapConfig = async (req, res) => {
	try {
		const map = await vistaActiva(req.db)
		if (!map) {
			return res.status(404).json({
				code: 'NO_MAP',
				message: 'No hay una vista de mapa configurada',
				elements: await elementosUbicados(req.db),
			})
		}
		return res.status(200).json(formatoVista(map))
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

/**
 * Alta de la vista por defecto. Solo si todavia no hay una activa: hay un solo
 * mapa, y para cambiarlo esta el PATCH.
 */
const addMapConfig = async (req, res) => {
	try {
		let campos
		try {
			campos = leerVista(req.body)
		} catch (e) {
			return res.status(400).json({ message: e.message })
		}
		if (await vistaActiva(req.db)) {
			return res.status(409).json({ code: 'MAP_EXISTS', message: 'Ya hay una vista de mapa configurada' })
		}
		const map = await req.db.MapLocation.create({ name: 'Mapa principal', ...campos, status: 1 })
		return res.status(200).json({ message: 'Vista del mapa creada', data: formatoVista(map) })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const editMapConfig = async (req, res) => {
	try {
		let cambios
		try {
			cambios = leerVista(req.body, true)
		} catch (e) {
			return res.status(400).json({ message: e.message })
		}
		const map = await vistaActiva(req.db)
		if (!map) return res.status(404).json({ code: 'NO_MAP', message: 'No hay una vista de mapa configurada' })

		await map.update(cambios)
		return res.status(200).json({ message: 'Vista del mapa actualizada', data: formatoVista(map) })
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
		const { data, skipped } = await getMapLive(req.db, req.user.influx)
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
	addMapConfig,
	editMapConfig,
	listLines,
	addLine,
	editLine,
	deleteLine,
	listElementUsage,
	liveData,
}
