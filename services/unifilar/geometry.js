// Geometría compartida del documento unifilar (ver dwgToDocument.js).
// Las coordenadas ya vienen en espacio SVG, con el eje Y invertido.
// Espejo de reconecta-desktop/src/modules/unifilar/utils/js/geometry.js.

const num = (v) => Number(v.toFixed(4))

// punto(a) = (cx + r·cos a, cy − r·sin a); arcos DWG son CCW → sweep=0
const arcPath = (e) => {
	const x1 = e.cx + e.r * Math.cos(e.a1)
	const y1 = e.cy - e.r * Math.sin(e.a1)
	const x2 = e.cx + e.r * Math.cos(e.a2)
	const y2 = e.cy - e.r * Math.sin(e.a2)
	const delta = (e.a2 - e.a1 + Math.PI * 2) % (Math.PI * 2)
	const largeArc = delta > Math.PI ? 1 : 0
	return `M ${num(x1)} ${num(y1)} A ${num(e.r)} ${num(e.r)} 0 ${largeArc} 0 ${num(x2)} ${num(y2)}`
}

const polylinePath = (e) => {
	const { points, bulges, closed } = e
	let d = `M ${num(points[0][0])} ${num(points[0][1])}`
	const segments = closed ? points.length : points.length - 1
	for (let i = 0; i < segments; i++) {
		const p1 = points[i]
		const p2 = points[(i + 1) % points.length]
		const bulge = bulges?.[i] || 0
		if (!bulge) {
			d += ` L ${num(p2[0])} ${num(p2[1])}`
			continue
		}
		const theta = 4 * Math.atan(bulge)
		const chord = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
		const r = Math.abs(chord / (2 * Math.sin(theta / 2)))
		const largeArc = Math.abs(theta) > Math.PI ? 1 : 0
		const sweep = bulge > 0 ? 0 : 1
		d += ` A ${num(r)} ${num(r)} 0 ${largeArc} ${sweep} ${num(p2[0])} ${num(p2[1])}`
	}
	if (closed) d += ' Z'
	return d
}

const entityBBox = (e) => {
	switch (e.type) {
		case 'line':
			return [Math.min(e.x1, e.x2), Math.min(e.y1, e.y2), Math.max(e.x1, e.x2), Math.max(e.y1, e.y2)]
		case 'circle':
		case 'arc':
			return [e.cx - e.r, e.cy - e.r, e.cx + e.r, e.cy + e.r]
		case 'polyline': {
			const xs = e.points.map((p) => p[0])
			const ys = e.points.map((p) => p[1])
			return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
		}
		case 'text': {
			const width = e.size * 0.6 * Math.max(...e.lines.map((l) => l.length))
			const x1 = e.anchor === 'end' ? e.x - width : e.anchor === 'middle' ? e.x - width / 2 : e.x
			return [x1, e.y - e.size, x1 + width, e.y + e.size * 1.2 * e.lines.length]
		}
		case 'symbol': {
			const half = (e.scale || 1) * 0.6
			return [e.x - half, e.y - half, e.x + half, e.y + half]
		}
		default:
			return null
	}
}

const unionBBox = (entities) => {
	const bbox = [Infinity, Infinity, -Infinity, -Infinity]
	for (const entity of entities) {
		const b = entityBBox(entity)
		if (!b) continue
		bbox[0] = Math.min(bbox[0], b[0])
		bbox[1] = Math.min(bbox[1], b[1])
		bbox[2] = Math.max(bbox[2], b[2])
		bbox[3] = Math.max(bbox[3], b[3])
	}
	return bbox[0] === Infinity ? null : bbox
}

const bboxIntersects = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]

const bboxSize = (b) => Math.max(b[2] - b[0], b[3] - b[1])

// Tamaño de referencia del plano, base de todos los umbrales relativos
const viewSizeOf = (entities) => {
	const b = unionBBox(entities)
	if (!b) return 100
	return Math.max(b[2] - b[0], b[3] - b[1]) * 1.04
}

// Los conductores de un esquema eléctrico son verticales u horizontales;
// los trazos que le dan forma a un símbolo son oblicuos, curvos o cerrados.
const isAxial = (e, eps) =>
	e.type === 'line' && (Math.abs(e.x1 - e.x2) < eps || Math.abs(e.y1 - e.y2) < eps)

module.exports = {
	num,
	arcPath,
	polylinePath,
	entityBBox,
	unionBBox,
	bboxIntersects,
	bboxSize,
	viewSizeOf,
	isAxial,
}
