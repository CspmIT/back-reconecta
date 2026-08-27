// Renderiza un documento de entidades (ver dwgToDocument.js) a SVG estático.
// Se usa para el SVG inicial tras la conversión del DWG; las ediciones del
// frontend mandan su propio SVG serializado junto con el documento.

const { num, arcPath, polylinePath, unionBBox } = require('./geometry')

const esc = (s) =>
	String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Los rellenos macizos del plano (bornes, puntas de flecha) llegan como
// circle/polyline con `filled`: pintan en vez de trazar.
const fillAttr = (e) => (e.filled ? ' class="dwg-fill"' : '')

const entityToSvg = (e) => {
	switch (e.type) {
		case 'line':
			return `<line id="${e.id}" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}"/>`
		case 'circle':
			return `<circle id="${e.id}" cx="${e.cx}" cy="${e.cy}" r="${e.r}"${fillAttr(e)}/>`
		case 'arc':
			return `<path id="${e.id}" d="${arcPath(e)}"/>`
		case 'polyline':
			return `<path id="${e.id}" d="${polylinePath(e)}"${fillAttr(e)}${e.filled ? '' : ' fill="none"'}/>`
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
	const bbox = unionBBox(document.entities)
	if (!bbox) throw new Error('Documento sin entidades dibujables')
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
		`<style>text{fill:#111;stroke:none}.dwg-fill{fill:#111;stroke:none}</style>\n${groups}\n</svg>`
	)
}

module.exports = { documentToSvg }
