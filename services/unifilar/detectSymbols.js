// Detección de símbolos sobre un documento importado de DWG.
//
// El DWG de un unifilar no trae bloques: llega como geometría explotada, sin
// nombres ni tipos. Lo que sí trae es repetición — el plano se dibuja copiando
// y pegando el mismo esquema de celda. Así que:
//
//   1. se agrupan los trazos en símbolos (mismo criterio que el clic del visor:
//      el cuerpo se expande sólo por trazos no axiales, y después se le suman
//      los latiguillos cortos),
//   2. se le calcula a cada símbolo una firma de forma invariante a traslación,
//   3. los que comparten firma son la misma copia, y se agrupan en "formas".
//
// El usuario tipifica cada forma una sola vez y el tipo se propaga a todas sus
// instancias. En E.T. Morteros: 97 símbolos en 16 formas.

const { entityBBox, unionBBox, bboxIntersects, bboxSize, viewSizeOf, isAxial } = require('./geometry')

const MAX_STROKES = 30

// Agrupa los trazos del símbolo al que pertenece `seedId`.
// Espejo de clusterFromSeed() en el frontend: ver geometry.js del desktop.
const clusterFromSeed = (entities, seedId, viewSize) => {
	const seed = entities.find((e) => e.id === seedId)
	if (!seed) return [seedId]
	const tolerance = viewSize * 0.002
	const maxSize = viewSize * 0.05
	const maxSpan = viewSize * 0.04
	const eps = viewSize * 0.0005
	const inflate = (b) => [b[0] - tolerance, b[1] - tolerance, b[2] + tolerance, b[3] + tolerance]
	const isStroke = (e) => e.type !== 'text' && e.type !== 'symbol'

	const seedBox = entityBBox(seed)
	if (!isStroke(seed) || isAxial(seed, eps) || bboxSize(seedBox) > maxSize) return [seedId]

	const bodies = entities.filter(
		(e) => isStroke(e) && !isAxial(e, eps) && bboxSize(entityBBox(e)) <= maxSize
	)
	const selected = new Set([seedId])
	let bbox = seedBox
	const queue = [seedBox]
	while (queue.length && selected.size < MAX_STROKES) {
		const inflated = inflate(queue.pop())
		for (const candidate of bodies) {
			if (selected.has(candidate.id)) continue
			const box = entityBBox(candidate)
			if (!bboxIntersects(inflated, box)) continue
			const grown = [
				Math.min(bbox[0], box[0]),
				Math.min(bbox[1], box[1]),
				Math.max(bbox[2], box[2]),
				Math.max(bbox[3], box[3]),
			]
			if (bboxSize(grown) > maxSpan) continue
			bbox = grown
			selected.add(candidate.id)
			queue.push(box)
		}
	}
	if (selected.size >= MAX_STROKES) return [seedId]

	const maxLead = bboxSize(bbox) * 0.5
	const bodyBox = inflate(bbox)
	for (const e of entities) {
		if (selected.has(e.id) || !isStroke(e) || !isAxial(e, eps)) continue
		const box = entityBBox(e)
		if (bboxSize(box) <= maxLead && bboxIntersects(bodyBox, box)) selected.add(e.id)
	}
	return [...selected]
}

// Firma de forma del símbolo, para reconocer las copias.
//
// El plano copia y pega la misma celda, y además la espeja y la rota (NORTE
// contra SUR). Un seccionador espejado sigue siendo un seccionador, así que la
// firma se canoniza sobre las 8 simetrías del cuadrado: se genera la firma de
// las 8 transformaciones y se toma la menor. Las coordenadas van cuantizadas a
// una fracción del tamaño del símbolo para absorber el error de coma flotante.
const DIHEDRAL = [
	([x0, y0, x1, y1], w, h) => [x0, y0, x1, y1, w, h], // identidad
	([x0, y0, x1, y1], w, h) => [w - x1, y0, w - x0, y1, w, h], // espejo en X
	([x0, y0, x1, y1], w, h) => [x0, h - y1, x1, h - y0, w, h], // espejo en Y
	([x0, y0, x1, y1], w, h) => [w - x1, h - y1, w - x0, h - y0, w, h], // giro 180°
	([x0, y0, x1, y1], w, h) => [h - y1, x0, h - y0, x1, h, w], // giro 90°
	([x0, y0, x1, y1], w, h) => [y0, x0, y1, x1, h, w], // transpuesta
	([x0, y0, x1, y1], w, h) => [y0, w - x1, y1, w - x0, h, w], // giro 270°
	([x0, y0, x1, y1], w, h) => [h - y1, w - x1, h - y0, w - x0, h, w], // antitranspuesta
]

const shapeKey = (entities, box) => {
	const w = box[2] - box[0]
	const h = box[3] - box[1]
	const q = Math.max(w, h, 1e-6) * 0.005
	const v = (n) => Math.round(n / q)
	const locals = entities.map((e) => {
		const b = entityBBox(e)
		return { tag: `${e.type[0]}${e.filled ? 'f' : ''}`, box: [b[0] - box[0], b[1] - box[1], b[2] - box[0], b[3] - box[1]] }
	})
	let best = null
	for (const transform of DIHEDRAL) {
		const key = locals
			.map(({ tag, box: b }) => {
				const [x0, y0, x1, y1] = transform(b, w, h)
				return `${tag}:${v(x0)},${v(y0)},${v(x1 - x0)},${v(y1 - y0)}`
			})
			.sort()
			.join(';')
		if (best === null || key < best) best = key
	}
	return `${v(Math.min(w, h))}x${v(Math.max(w, h))}|${best}`
}

// Clave corta y estable derivada del contenido de la firma (FNV-1a). Tiene que
// ser estable: la tipificación que hace el usuario se guarda con esta clave y
// tiene que seguir valiendo cuando se vuelva a detectar el mismo plano.
const shapeId = (signature) => {
	let h = 0x811c9dc5
	for (let i = 0; i < signature.length; i++) {
		h ^= signature.charCodeAt(i)
		h = Math.imul(h, 0x01000193) >>> 0
	}
	return `f${h.toString(36).padStart(7, '0')}`
}

// Rótulo más cercano al símbolo, si hay alguno lo bastante cerca para ser suyo
const nearestLabel = (texts, box) => {
	const cx = (box[0] + box[2]) / 2
	const cy = (box[1] + box[3]) / 2
	const reach = bboxSize(box) * 3
	let best = null
	for (const t of texts) {
		const b = entityBBox(t)
		const d = Math.hypot((b[0] + b[2]) / 2 - cx, (b[1] + b[3]) / 2 - cy)
		if (d <= reach && (!best || d < best.d)) best = { d, text: t.lines.join(' ') }
	}
	return best?.text || null
}

// Segundo detector: los símbolos que el primero no puede ver.
//
// El detector principal arranca de un trazo no axial (oblicuo, arco, círculo,
// polilínea), que es lo que le da forma a un símbolo IEC. Pero el plano tiene
// símbolos dibujados SÓLO con trazos axiales — abanicos de líneas paralelas
// cortas, rellenos hechos a mano — y esos son invisibles para él: no hay de
// dónde arrancar, y las líneas axiales no expanden el cuerpo (a propósito: es
// lo que evitaba que un clic encadenara tres símbolos vecinos).
//
// Acá se agrupan los trazos que quedaron sueltos, y en vez de confiar en un
// umbral se valida con la repetición: el plano es 96% copy-paste, así que un
// grupo que sea un símbolo de verdad aparece idéntico varias veces. Un grupo
// mal armado (pedazos de conductor) no se repite. La repetición hace de
// verificación, y por eso se puede agrupar con la mano suelta.
const detectRepeated = (entities, taken, viewSize, minCopies = 2) => {
	const tolerance = viewSize * 0.002
	const maxSpan = viewSize * 0.03
	const maxStroke = viewSize * 0.012
	const eps = viewSize * 0.0005

	const candidates = entities.filter(
		(e) =>
			!taken.has(e.id) &&
			e.type !== 'text' &&
			e.type !== 'symbol' &&
			bboxSize(entityBBox(e)) <= maxStroke
	)

	// Los trazos de una trama vienen en HAZ: paralelos, muy juntos y solapados.
	// Un tramo de conductor está solo en su eje. Sin este filtro el detector se
	// come el ruteo de la celda — y la repetición no lo delata, porque el ruteo
	// también está copiado 12 veces.
	const enHaz = (e) => {
		if (e.type !== 'line') return true
		const vertical = Math.abs(e.x1 - e.x2) < eps
		const largo = bboxSize(entityBBox(e))
		const fijo = vertical ? e.x1 : e.y1
		const [lo, hi] = vertical ? [e.y1, e.y2].sort((a, b) => a - b) : [e.x1, e.x2].sort((a, b) => a - b)
		let vecinos = 0
		for (const other of candidates) {
			if (other === e || other.type !== 'line') continue
			if ((Math.abs(other.x1 - other.x2) < eps) !== vertical) continue
			const otroFijo = vertical ? other.x1 : other.y1
			if (Math.abs(otroFijo - fijo) > largo * 0.5 || Math.abs(otroFijo - fijo) < eps) continue
			const [olo, ohi] = vertical
				? [other.y1, other.y2].sort((a, b) => a - b)
				: [other.x1, other.x2].sort((a, b) => a - b)
			if (ohi < lo - eps || olo > hi + eps) continue
			if (++vecinos >= 2) return true
		}
		return false
	}
	const loose = candidates.filter(enHaz)
	const boxes = new Map(loose.map((e) => [e.id, entityBBox(e)]))
	const inflate = (b) => [b[0] - tolerance, b[1] - tolerance, b[2] + tolerance, b[3] + tolerance]

	const grow = (seed) => {
		const selected = new Set([seed.id])
		let bbox = boxes.get(seed.id)
		const queue = [bbox]
		while (queue.length && selected.size < 40) {
			const inflated = inflate(queue.pop())
			for (const candidate of loose) {
				if (selected.has(candidate.id)) continue
				const box = boxes.get(candidate.id)
				if (!bboxIntersects(inflated, box)) continue
				const grown = [
					Math.min(bbox[0], box[0]),
					Math.min(bbox[1], box[1]),
					Math.max(bbox[2], box[2]),
					Math.max(bbox[3], box[3]),
				]
				if (bboxSize(grown) > maxSpan) continue
				bbox = grown
				selected.add(candidate.id)
				queue.push(box)
			}
		}
		return selected.size >= 40 ? null : [...selected].sort()
	}

	// un grupo por semilla, después se quedan los maximales
	const seen = new Map()
	for (const e of loose) {
		// un trazo axial largo es conductor, no sirve de semilla
		if (isAxial(e, eps) && bboxSize(boxes.get(e.id)) > viewSize * 0.008) continue
		const ids = grow(e)
		if (ids && ids.length >= 2) seen.set(ids.join(','), ids)
	}
	const claimed = new Set()
	const groups = []
	for (const ids of [...seen.values()].sort((a, b) => b.length - a.length)) {
		if (ids.some((id) => claimed.has(id))) continue
		ids.forEach((id) => claimed.add(id))
		groups.push(ids)
	}

	// validación por repetición: sólo sobreviven las formas que se repiten
	const byId = new Map(entities.map((e) => [e.id, e]))
	const withKey = groups.map((ids) => {
		const members = ids.map((id) => byId.get(id))
		const box = unionBBox(members)
		return { ids, box, key: shapeKey(members, box) }
	})
	const copies = new Map()
	for (const g of withKey) copies.set(g.key, (copies.get(g.key) || 0) + 1)
	return withKey.filter((g) => copies.get(g.key) >= minCopies)
}

const detectSymbols = (document) => {
	const entities = document.entities
	const byId = new Map(entities.map((e) => [e.id, e]))
	const viewSize = viewSizeOf(entities)
	const eps = viewSize * 0.0005
	const texts = entities.filter((e) => e.type === 'text')

	// Un cluster por cada trazo que pueda ser cuerpo de símbolo; después se
	// descartan los que son subconjunto de otro más grande.
	const seen = new Map()
	for (const e of entities) {
		if (e.type === 'text' || e.type === 'symbol' || isAxial(e, eps)) continue
		const ids = clusterFromSeed(entities, e.id, viewSize).sort()
		if (ids.length < 2) continue
		seen.set(ids.join(','), ids)
	}
	const taken = new Set()
	const found = []
	for (const ids of [...seen.values()].sort((a, b) => b.length - a.length)) {
		if (ids.some((id) => taken.has(id))) continue
		ids.forEach((id) => taken.add(id))
		const members = ids.map((id) => byId.get(id))
		const box = unionBBox(members)
		found.push({ ids, box, key: shapeKey(members, box) })
	}

	// Los símbolos que el detector principal no puede ver, validados por
	// repetición (ver detectRepeated): sólo entran las formas que se repiten.
	for (const group of detectRepeated(entities, taken, viewSize)) {
		group.ids.forEach((id) => taken.add(id))
		found.push(group)
	}

	const symbols = found.map(({ ids, box, key }, i) => ({
		id: `s${i + 1}`,
		shape: key,
		entities: ids,
		x: Number(((box[0] + box[2]) / 2).toFixed(4)),
		y: Number(((box[1] + box[3]) / 2).toFixed(4)),
		w: Number((box[2] - box[0]).toFixed(4)),
		h: Number((box[3] - box[1]).toFixed(4)),
		label: nearestLabel(texts, box),
	}))

	// Formas: los símbolos que comparten firma son la misma copia. Se ordenan
	// por frecuencia, para que la más repetida sea la primera que se tipifica.
	const byShape = new Map()
	for (const s of symbols) {
		if (!byShape.has(s.shape)) byShape.set(s.shape, [])
		byShape.get(s.shape).push(s)
	}
	for (const s of symbols) s.shape = shapeId(s.shape)
	const shapes = [...byShape.entries()]
		.sort((a, b) => b[1].length - a[1].length || b[1][0].entities.length - a[1][0].entities.length)
		.map(([signature, group]) => {
			const sample = group[0]
			return {
				key: shapeId(signature),
				count: group.length,
				strokes: sample.entities.length,
				w: sample.w,
				h: sample.h,
				sample: sample.id,
				labels: [...new Set(group.map((s) => s.label).filter(Boolean))].slice(0, 4),
			}
		})

	return { symbols, shapes }
}

module.exports = { detectSymbols, clusterFromSeed }
