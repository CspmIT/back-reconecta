// Convierte el dump JSON de dwgread (LibreDWG) a un "documento" normalizado:
// la fuente de verdad editable del plano. Todas las coordenadas quedan ya en
// espacio SVG (eje Y invertido respecto del DWG).
//
// Formato de entidades (version 1):
//   { id, type: 'line',     layer, x1, y1, x2, y2 }
//   { id, type: 'circle',   layer, cx, cy, r }
//   { id, type: 'arc',      layer, cx, cy, r, a1, a2 }
//     → punto(a) = (cx + r·cos a, cy − r·sin a); arco de a1 a a2, sweep=0
//   { id, type: 'polyline', layer, points: [[x,y]…], bulges, closed }
//   { id, type: 'text',     layer, x, y, size, anchor, baseline, lines: [] }
//   { id, type: 'symbol',   layer, symbol, x, y, rot, scale }  (solo editor)

const { num } = require('./geometry')

// Los MTEXT traen códigos de formato de AutoCAD: {\fArial|b1;TC 1}, \A1;, \P…
// Además hay dos formas de escribir caracteres que no están en el teclado:
// \U+00B0 (MTEXT, unicode) y %%d / %%c / %%p (heredado de TEXT/DIM).
const CONTROL_CODES = { d: '°', c: 'Ø', p: '±', '%': '%' }

const cleanMtext = (raw) => {
	let text = String(raw)
	text = text.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
	text = text.replace(/%%([dcp%])/gi, (_, code) => CONTROL_CODES[code.toLowerCase()])
	text = text.replace(/\{\\[^;{}]*;([^{}]*)\}/g, '$1') // {\f...;contenido}
	text = text.replace(/\\A\d;/g, '') // alineación
	text = text.replace(/\\[fFcChHtTqQwW][^;\\]*;/g, '') // otros códigos con parámetro
	text = text.replace(/\\~/g, ' ')
	text = text.replace(/[{}]/g, '')
	return text
		.split(/\\P/i)
		.map((line) => line.trim())
		.filter(Boolean)
}

const layerNameMap = (objects) => {
	const map = {}
	for (const obj of objects) {
		if (obj.object === 'LAYER') {
			const handle = obj.handle?.[2]
			map[handle] = obj.name || `layer-${handle}`
		}
	}
	return map
}

const layerOf = (entity, layers) => {
	const ref = entity.layer
	const handle = Array.isArray(ref) ? ref[ref.length - 1] : ref
	return layers[handle] || '0'
}

// attachment MTEXT: 1..9 en filas TL,TC,TR / ML,MC,MR / BL,BC,BR
const textAnchor = (attachment) => ['start', 'middle', 'end'][(attachment - 1) % 3] || 'start'
const textBaseline = (attachment) => {
	const row = Math.floor((attachment - 1) / 3)
	return row === 0 ? 'hanging' : row === 1 ? 'central' : 'auto'
}

const toEntity = (obj, layers) => {
	const id = `h${obj.handle?.[2]}`
	const layer = layerOf(obj, layers)
	switch (obj.entity) {
		case 'LINE':
			return {
				id,
				type: 'line',
				layer,
				x1: num(obj.start[0]),
				y1: num(-obj.start[1]),
				x2: num(obj.end[0]),
				y2: num(-obj.end[1]),
			}
		case 'CIRCLE':
			return { id, type: 'circle', layer, cx: num(obj.center[0]), cy: num(-obj.center[1]), r: num(obj.radius) }
		case 'ARC':
			return {
				id,
				type: 'arc',
				layer,
				cx: num(obj.center[0]),
				cy: num(-obj.center[1]),
				r: num(obj.radius),
				a1: num(obj.start_angle),
				a2: num(obj.end_angle),
			}
		case 'LWPOLYLINE': {
			if (!obj.points?.length) return null
			return {
				id,
				type: 'polyline',
				layer,
				points: obj.points.map(([x, y]) => [num(x), num(-y)]),
				bulges: obj.bulges || [],
				closed: Boolean(obj.flag & 512),
			}
		}
		case 'MTEXT': {
			const lines = cleanMtext(obj.text)
			if (!lines.length) return null
			return {
				id,
				type: 'text',
				layer,
				x: num(obj.ins_pt[0]),
				y: num(-obj.ins_pt[1]),
				size: num((obj.text_height || 1) * 1.25),
				anchor: textAnchor(obj.attachment || 1),
				baseline: textBaseline(obj.attachment || 1),
				lines,
			}
		}
		case 'HATCH': {
			// Los rellenos macizos del plano: bornes (círculo), puntas de flecha
			// (triángulo) y algún recuadro. Se importan como la entidad que ya
			// corresponde con `filled`, en vez de un tipo nuevo. Sólo el contorno
			// externo (flag & 1): los caminos internos son subdetalles asociativos.
			if (!obj.is_solid_fill) return null
			const path = (obj.paths || []).find((p) => p.flag & 1)
			if (!path) return null
			const circle = path.segs?.length === 1 && path.segs[0].curve_type === 2 ? path.segs[0] : null
			if (circle) {
				return {
					id,
					type: 'circle',
					layer,
					cx: num(circle.center[0]),
					cy: num(-circle.center[1]),
					r: num(circle.radius),
					filled: true,
				}
			}
			const points = []
			const bulges = []
			if (path.polyline_paths?.length) {
				for (const p of path.polyline_paths) {
					points.push([num(p.point[0]), num(-p.point[1])])
					// el eje Y invertido cambia el sentido de giro del arco
					bulges.push(-(p.bulge || 0))
				}
			} else {
				for (const seg of path.segs || []) {
					if (!seg.first_endpoint) continue
					points.push([num(seg.first_endpoint[0]), num(-seg.first_endpoint[1])])
					bulges.push(0)
				}
			}
			if (points.length < 3) return null
			return { id, type: 'polyline', layer, points, bulges, closed: true, filled: true }
		}
		default:
			return null
	}
}

const DRAWABLE = new Set(['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'MTEXT', 'HATCH'])

const dwgJsonToDocument = (dwgJson) => {
	const objects = dwgJson?.OBJECTS || []
	const layers = layerNameMap(objects)
	const entities = []
	for (const obj of objects) {
		// entmode 2 = model space (1 = paper space, 0 = dentro de un bloque)
		if (!DRAWABLE.has(obj.entity) || obj.entmode !== 2) continue
		const entity = toEntity(obj, layers)
		if (entity) entities.push(entity)
	}
	if (!entities.length) {
		throw new Error('El DWG no contiene entidades dibujables soportadas')
	}
	const usedLayers = [...new Set(entities.map((e) => e.layer))]
	return {
		version: 1,
		layers: usedLayers.map((name) => ({ name, hidden: false })),
		entities,
	}
}

module.exports = { dwgJsonToDocument, cleanMtext }
