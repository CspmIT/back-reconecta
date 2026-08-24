/**
 * Tramos de la red dibujados sobre el mapa.
 *
 * Un tramo (MapLine) es una polilinea con nombre. Sus vertices viven en
 * MapLineVertices y pueden estar anclados a un Element (id_element) o ser
 * libres (lat/lon propias). Si el vertice esta anclado, la coordenada se
 * resuelve del elemento en tiempo de lectura: mover un reconectador desde el
 * ABM arrastra el trazo sin tocar el tramo.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */

// MySQL devuelve DECIMAL como string. Sin esto, Leaflet recibe "-30.7" y no -30.7.
const num = (v) => (v === null || v === undefined ? null : parseFloat(v))

const includeVertices = (db) => ({
	model: db.MapLineVertex,
	as: 'vertices',
	include: [
		{
			model: db.Element,
			as: 'element',
			attributes: ['id', 'name', 'lat', 'lon', 'type'],
			required: false,
		},
	],
})

/**
 * Aplana un tramo a la forma que consume el mapa: coordenadas ya resueltas,
 * mas el detalle de cada vertice para el editor.
 */
const formatLine = (line) => {
	const json = line.toJSON ? line.toJSON() : line
	const vertices = (json.vertices || [])
		.slice()
		.sort((a, b) => a.seq - b.seq)
		.map((v) => {
			const anchored = v.id_element !== null && v.id_element !== undefined
			return {
				seq: v.seq,
				id_element: anchored ? v.id_element : null,
				element_name: anchored ? v.element?.name ?? null : null,
				lat: anchored ? num(v.element?.lat) : num(v.lat),
				lon: anchored ? num(v.element?.lon) : num(v.lon),
			}
		})
	return {
		id: json.id,
		name: json.name,
		vertices,
		// Atajos para dibujar sin recorrer vertices en el front
		points: vertices.filter((v) => v.lat !== null && v.lon !== null).map((v) => [v.lat, v.lon]),
		anchors: vertices.map((v) => v.id_element),
	}
}

const getLines = async (db) => {
	const lines = await db.MapLine.findAll({
		where: { status: 1 },
		include: [includeVertices(db)],
		order: [['id', 'ASC']],
	})
	return lines.map(formatLine)
}

const getLine = async (db, id) => {
	const line = await db.MapLine.findOne({
		where: { id, status: 1 },
		include: [includeVertices(db)],
	})
	return line ? formatLine(line) : null
}

/**
 * Normaliza y valida los vertices que llegan del cliente. El `seq` lo asigna
 * el orden del array: no se confia en el que manda el front.
 */
const normalizeVertices = async (db, vertices) => {
	if (!Array.isArray(vertices) || vertices.length < 2) {
		throw new Error('Un tramo necesita al menos 2 vertices')
	}

	const ids = [...new Set(vertices.map((v) => v?.id_element).filter((id) => id !== null && id !== undefined))]
	if (ids.length > 0) {
		const found = await db.Element.findAll({ where: { id: ids }, attributes: ['id'] })
		if (found.length !== ids.length) {
			const encontrados = new Set(found.map((e) => e.id))
			const faltantes = ids.filter((id) => !encontrados.has(id))
			throw new Error(`No existen los elementos: ${faltantes.join(', ')}`)
		}
	}

	return vertices.map((v, index) => {
		const anchored = v?.id_element !== null && v?.id_element !== undefined
		if (anchored) {
			return { seq: index, id_element: v.id_element, lat: null, lon: null }
		}
		const lat = num(v?.lat)
		const lon = num(v?.lon)
		if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) {
			throw new Error(`El vertice ${index} no esta anclado y no trae lat/lon validas`)
		}
		return { seq: index, id_element: null, lat, lon }
	})
}

const saveLine = async (db, { name, vertices }) => {
	if (!name || !String(name).trim()) throw new Error('El tramo necesita un nombre')
	const rows = await normalizeVertices(db, vertices)

	const transaction = await db.sequelize.transaction()
	try {
		const line = await db.MapLine.create({ name: String(name).trim(), status: 1 }, { transaction })
		await db.MapLineVertex.bulkCreate(
			rows.map((r) => ({ ...r, id_line: line.id })),
			{ transaction, validate: true }
		)
		await transaction.commit()
		return await getLine(db, line.id)
	} catch (e) {
		await transaction.rollback()
		throw e
	}
}

/**
 * Reescribe el tramo completo: borra los vertices y los reinserta en orden.
 * Con 5-15 vertices por tramo no vale la pena hacer diff ni reordenar in situ,
 * y evita colisiones con el unique (id_line, seq).
 */
const updateLine = async (db, id, { name, vertices }) => {
	const line = await db.MapLine.findOne({ where: { id, status: 1 } })
	if (!line) throw new Error('Tramo no encontrado')

	const rows = vertices === undefined ? null : await normalizeVertices(db, vertices)

	const transaction = await db.sequelize.transaction()
	try {
		if (name !== undefined) {
			if (!String(name).trim()) throw new Error('El tramo necesita un nombre')
			await line.update({ name: String(name).trim() }, { transaction })
		}
		if (rows) {
			await db.MapLineVertex.destroy({ where: { id_line: id }, transaction })
			await db.MapLineVertex.bulkCreate(
				rows.map((r) => ({ ...r, id_line: id })),
				{ transaction, validate: true }
			)
		}
		await transaction.commit()
		return await getLine(db, id)
	} catch (e) {
		await transaction.rollback()
		throw e
	}
}

/**
 * Baja logica, como el resto del sistema. Los vertices quedan, asi el tramo
 * se puede recuperar; el unique (id_line, seq) no molesta porque el id_line
 * sigue siendo el mismo.
 */
const removeLine = async (db, id) => {
	const line = await db.MapLine.findOne({ where: { id, status: 1 } })
	if (!line) throw new Error('Tramo no encontrado')
	await line.update({ status: 0 })
	return { id }
}

/**
 * Tramos activos que dependen de un elemento. Lo usa el ABM para avisar antes
 * de intentar borrarlo, en vez de comerse el error del RESTRICT.
 */
const getElementUsage = async (db, idElement) => {
	const vertices = await db.MapLineVertex.findAll({
		where: { id_element: idElement },
		include: [{ model: db.MapLine, as: 'line', where: { status: 1 }, required: true }],
	})
	const lines = new Map()
	vertices.forEach((v) => lines.set(v.line.id, v.line.name))
	return [...lines].map(([id, name]) => ({ id, name }))
}

module.exports = {
	getLines,
	getLine,
	saveLine,
	updateLine,
	removeLine,
	getElementUsage,
}
