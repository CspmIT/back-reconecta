// Limpieza del documento recién importado. Los planos DWG reales traen
// bastante ruido que no se ve pero ensucia todo lo que se calcule encima
// (agrupado de símbolos, grafo de conductores, peso del SVG):
//
//   · trazos dibujados dos veces, exactamente encima
//   · segmentos de longitud cero
//   · conductores partidos en muchos tramos colineales contiguos
//
// Es una pasada determinista: no mueve nada de lugar ni cambia el dibujo.

const { num, entityBBox, bboxSize, viewSizeOf, isAxial } = require('./geometry')

// Clave de identidad geométrica, para detectar trazos repetidos.
const signature = (e) => {
	const r = (v) => Math.round(v * 1000) / 1000
	switch (e.type) {
		case 'line': {
			// una línea es la misma dibujada en cualquiera de los dos sentidos
			const ends = [`${r(e.x1)},${r(e.y1)}`, `${r(e.x2)},${r(e.y2)}`].sort()
			return `L|${e.layer}|${ends.join('|')}`
		}
		case 'circle':
			return `C|${e.layer}|${r(e.cx)},${r(e.cy)},${r(e.r)}|${e.filled ? 1 : 0}`
		case 'arc':
			return `A|${e.layer}|${r(e.cx)},${r(e.cy)},${r(e.r)},${r(e.a1)},${r(e.a2)}`
		case 'polyline':
			return `P|${e.layer}|${e.points.map((p) => `${r(p[0])},${r(p[1])}`).join('|')}|${e.filled ? 1 : 0}`
		case 'text':
			return `T|${e.layer}|${r(e.x)},${r(e.y)}|${e.lines.join('~')}`
		default:
			return `X|${e.id}`
	}
}

// Puntos donde termina alguna entidad, contados. Un empalme entre dos tramos
// colineales sólo se puede unir si ahí no se conecta nada más: si hay una
// derivación o el latiguillo de un símbolo, el punto es topológicamente
// significativo y el tramo no se toca.
const endpointCounts = (entities, eps) => {
	const counts = new Map()
	const key = (x, y) => `${Math.round(x / eps)},${Math.round(y / eps)}`
	const add = (x, y) => counts.set(key(x, y), (counts.get(key(x, y)) || 0) + 1)
	for (const e of entities) {
		switch (e.type) {
			case 'line':
				add(e.x1, e.y1)
				add(e.x2, e.y2)
				break
			case 'arc':
				add(e.cx + e.r * Math.cos(e.a1), e.cy - e.r * Math.sin(e.a1))
				add(e.cx + e.r * Math.cos(e.a2), e.cy - e.r * Math.sin(e.a2))
				break
			case 'polyline':
				for (const [x, y] of e.points) add(x, y)
				break
			default:
				break
		}
	}
	return { counts, at: (x, y) => counts.get(key(x, y)) || 0 }
}

// Une los tramos axiales colineales que se tocan en un solo segmento. Se hace
// por eje y por coordenada fija, así que dos conductores paralelos nunca se
// mezclan, y sólo a través de empalmes libres. Conserva el id del primer tramo.
const mergeAxialRuns = (entities, eps) => {
	const ends = endpointCounts(entities, eps)
	const runs = new Map() // `${eje}|${capa}|${coordenada fija}` → tramos
	const rest = []
	for (const e of entities) {
		if (!isAxial(e, eps)) {
			rest.push(e)
			continue
		}
		const vertical = Math.abs(e.x1 - e.x2) < eps
		const fixed = vertical ? e.x1 : e.y1
		const key = `${vertical ? 'V' : 'H'}|${e.layer}|${Math.round(fixed / eps)}`
		if (!runs.has(key)) runs.set(key, [])
		runs.get(key).push({ e, vertical, lo: 0, hi: 0 })
	}

	const merged = []
	for (const group of runs.values()) {
		const segs = group
			.map(({ e, vertical }) => {
				const a = vertical ? e.y1 : e.x1
				const b = vertical ? e.y2 : e.x2
				return { e, vertical, lo: Math.min(a, b), hi: Math.max(a, b) }
			})
			.sort((x, y) => x.lo - y.lo)
		let run = null
		const flush = () => {
			if (!run) return
			const { e, vertical, lo, hi } = run
			merged.push(
				vertical
					? { ...e, x1: e.x1, y1: num(lo), x2: e.x1, y2: num(hi) }
					: { ...e, x1: num(lo), y1: e.y1, x2: num(hi), y2: e.y1 }
			)
			run = null
		}
		for (const seg of segs) {
			const fixed = seg.vertical ? seg.e.x1 : seg.e.y1
			// solapado o contiguo con el tirón que venimos armando
			const continuo = run && seg.lo <= run.hi + eps
			// y el empalme está libre: sólo terminan ahí estos dos tramos
			const empalmeLibre =
				continuo &&
				(seg.lo < run.hi - eps ||
					ends.at(seg.vertical ? fixed : seg.lo, seg.vertical ? seg.lo : fixed) <= 2)
			if (continuo && empalmeLibre) {
				run.hi = Math.max(run.hi, seg.hi)
				continue
			}
			flush()
			run = { e: seg.e, vertical: seg.vertical, lo: seg.lo, hi: seg.hi }
		}
		flush()
	}
	return [...rest, ...merged]
}

const normalizeDocument = (document) => {
	const input = document.entities
	const viewSize = viewSizeOf(input)
	const eps = viewSize * 0.0005
	const stats = { input: input.length, empty: 0, duplicated: 0, merged: 0 }

	// 1. segmentos de longitud cero: no dibujan nada y ensucian el grafo
	let entities = input.filter((e) => {
		const box = entityBBox(e)
		const empty =
			(e.type === 'line' && Math.hypot(e.x2 - e.x1, e.y2 - e.y1) < eps) ||
			((e.type === 'circle' || e.type === 'arc') && e.r < eps) ||
			(box && e.type !== 'text' && bboxSize(box) < eps)
		if (empty) stats.empty++
		return !empty
	})

	// 2. trazos repetidos exactamente encima
	const seen = new Set()
	entities = entities.filter((e) => {
		const key = signature(e)
		if (seen.has(key)) {
			stats.duplicated++
			return false
		}
		seen.add(key)
		return true
	})

	// 3. conductores partidos en tramos contiguos
	const before = entities.length
	entities = mergeAxialRuns(entities, eps)
	stats.merged = before - entities.length

	// Se recalculan las capas en uso: la limpieza puede vaciar alguna
	const used = new Set(entities.map((e) => e.layer))
	const layers = (document.layers || []).filter((l) => used.has(l.name))
	stats.output = entities.length
	return { document: { ...document, layers, entities }, stats }
}

module.exports = { normalizeDocument, signature }
