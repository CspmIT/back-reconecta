// Renderiza un documento de entidades (ver dwgToDocument.js) a SVG estático.
// Se usa para el SVG inicial tras la conversión del DWG; las ediciones del
// frontend mandan su propio SVG serializado junto con el documento.

const esc = (s) =>
	String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const num = (v) => Number(v.toFixed(4))

const arcPath = (e) => {
	// punto(a) = (cx + r·cos a, cy − r·sin a); arcos DWG son CCW → sweep=0
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
			return [e.x, e.y, e.x + width, e.y + e.size * 1.2 * e.lines.length]
		}
		case 'symbol': {
			const half = (e.scale || 1) / 2
			return [e.x - half, e.y - half, e.x + half, e.y + half]
		}
		default:
			return null
	}
}

const entityToSvg = (e) => {
	switch (e.type) {
		case 'line':
			return `<line id="${e.id}" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}"/>`
		case 'circle':
			return `<circle id="${e.id}" cx="${e.cx}" cy="${e.cy}" r="${e.r}"/>`
		case 'arc':
			return `<path id="${e.id}" d="${arcPath(e)}"/>`
		case 'polyline':
			return `<path id="${e.id}" d="${polylinePath(e)}" fill="none"/>`
		case 'text': {
			const tspans = e.lines
				.map((line, i) => `<tspan x="${e.x}" ${i === 0 ? '' : `dy="${num(e.size * 1.12)}"`}>${esc(line)}</tspan>`)
				.join('')
			return `<text id="${e.id}" x="${e.x}" y="${e.y}" font-size="${e.size}" text-anchor="${e.anchor}" dominant-baseline="${e.baseline}">${tspans}</text>`
		}
		default:
			// 'symbol' solo existe tras editar en el frontend, que manda su SVG
			return null
	}
}

const documentToSvg = (document) => {
	const bbox = [Infinity, Infinity, -Infinity, -Infinity]
	for (const entity of document.entities) {
		const b = entityBBox(entity)
		if (!b) continue
		bbox[0] = Math.min(bbox[0], b[0])
		bbox[1] = Math.min(bbox[1], b[1])
		bbox[2] = Math.max(bbox[2], b[2])
		bbox[3] = Math.max(bbox[3], b[3])
	}
	if (bbox[0] === Infinity) throw new Error('Documento sin entidades dibujables')
	const width = bbox[2] - bbox[0]
	const height = bbox[3] - bbox[1]
	const pad = Math.max(width, height) * 0.02
	const viewBox = [num(bbox[0] - pad), num(bbox[1] - pad), num(width + pad * 2), num(height + pad * 2)].join(' ')
	const strokeWidth = num(Math.max(width, height) / 1200)
	const hidden = new Set((document.layers || []).filter((l) => l.hidden).map((l) => l.name))
	const byLayer = {}
	for (const entity of document.entities) {
		if (hidden.has(entity.layer)) continue
		const el = entityToSvg(entity)
		if (!el) continue
		if (!byLayer[entity.layer]) byLayer[entity.layer] = []
		byLayer[entity.layer].push(el)
	}
	const groups = Object.entries(byLayer)
		.map(([layer, elements]) => `<g data-layer="${esc(layer)}" class="dwg-layer">${elements.join('')}</g>`)
		.join('\n')
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ` +
		`fill="none" stroke="#111" stroke-width="${strokeWidth}" ` +
		`stroke-linecap="round" stroke-linejoin="round" ` +
		`style="font-family: Arial, sans-serif">` +
		`<style>text{fill:#111;stroke:none}</style>\n${groups}\n</svg>`
	)
}

module.exports = { documentToSvg }
