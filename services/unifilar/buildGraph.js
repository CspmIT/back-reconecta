// Grafo topológico del unifilar: nodos y aristas a partir de la geometría.
//
// Es la base de todo lo que necesita saber "qué está conectado con qué":
// energización, trazado aguas abajo, color por nivel de tensión, simular falla.
//
// Cómo se arma, y por qué así:
//
//   1. Los conductores son los tramos axiales. Un extremo que cae en el MEDIO
//      de otro tramo también es una conexión (la derivación en T de cada celda
//      colgada de la barra): son 231 de las 398 puntas libres del plano real,
//      así que hay que partir el tramo en ese punto, no ignorarlo.
//   2. Cada símbolo detectado se convierte en una arista de dos bornes. Se le
//      corta el conductor en su huella y se descarta el pedazo de adentro: si
//      no, el aparato queda en paralelo con un cable y abrirlo no corta nada.
//      Da igual que el DWG haya dibujado el cable atravesando el símbolo o que
//      haya dejado el hueco: los dos casos terminan igual.
//   3. Encima va una capa de correcciones a mano (`fixes`) que sobrevive a
//      reprocesar el plano, porque siempre van a quedar huecos que la
//      geometría no explica.
//
// Los ids de nodo se derivan de la coordenada cuantizada, así que son estables
// entre importaciones mientras el dibujo no se mueva. De eso depende que las
// correcciones guardadas sigan valiendo.

const { unionBBox, viewSizeOf, isAxial } = require('./geometry')

// Agrupa puntos por proximidad y le da a cada grupo un id estable.
//
// Cuantizar la coordenada a una rejilla (`Math.round(x/snap)`) NO sirve como
// snapping: dos puntos a menos de `snap` caen en celdas distintas si el borde
// de la celda los separa. En el plano real eso partía el grafo en 126 pedazos,
// con huecos de 0,2 unidades entre nodos que eran el mismo punto.
//
// El id sale del punto menor del grupo, así que es determinista para la misma
// geometría: de eso depende que las correcciones guardadas sigan valiendo al
// reimportar el plano.
const clusterPoints = (points, snap) => {
	const cell = (v) => Math.floor(v / snap)
	const grid = new Map()
	points.forEach(([x, y], i) => {
		const key = `${cell(x)},${cell(y)}`
		if (!grid.has(key)) grid.set(key, [])
		grid.get(key).push(i)
	})

	const parent = points.map((_, i) => i)
	const find = (i) => {
		while (parent[i] !== i) {
			parent[i] = parent[parent[i]]
			i = parent[i]
		}
		return i
	}
	const union = (a, b) => {
		const [ra, rb] = [find(a), find(b)]
		if (ra !== rb) parent[ra] = rb
	}
	points.forEach(([x, y], i) => {
		// se mira la vecindad de 3x3 celdas: fuera de ahí no puede haber nada
		// a menos de `snap`
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (const j of grid.get(`${cell(x) + dx},${cell(y) + dy}`) || []) {
					if (j <= i) continue
					const [jx, jy] = points[j]
					if (Math.hypot(jx - x, jy - y) <= snap) union(i, j)
				}
			}
		}
	})

	const ids = new Map() // raíz → id
	const reps = new Map() // raíz → punto menor del grupo
	points.forEach(([x, y], i) => {
		const root = find(i)
		const best = reps.get(root)
		if (!best || x < best[0] || (x === best[0] && y < best[1])) reps.set(root, [x, y])
	})
	for (const [root, [x, y]] of reps) {
		ids.set(root, `n${x.toFixed(3)}_${y.toFixed(3)}`)
	}

	const at = (x, y) => {
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (const j of grid.get(`${cell(x) + dx},${cell(y) + dy}`) || []) {
					const [jx, jy] = points[j]
					if (Math.hypot(jx - x, jy - y) <= snap) return ids.get(find(j))
				}
			}
		}
		return null
	}
	const list = () => {
		const out = new Map()
		points.forEach(([x, y], i) => {
			const id = ids.get(find(i))
			if (!out.has(id)) out.set(id, { id, x, y })
		})
		return out
	}
	return { at, list }
}

// Los tramos axiales, en coordenadas de eje: (fija, desde..hasta)
const toSegments = (entities, eps) =>
	entities.filter((e) => isAxial(e, eps)).map((e) => {
		const vertical = Math.abs(e.x1 - e.x2) < eps
		const a = vertical ? e.y1 : e.x1
		const b = vertical ? e.y2 : e.x2
		return {
			entity: e.id,
			layer: e.layer,
			vertical,
			fixed: vertical ? e.x1 : e.y1,
			lo: Math.min(a, b),
			hi: Math.max(a, b),
		}
	})

const pointOf = (seg, at) => (seg.vertical ? [seg.fixed, at] : [at, seg.fixed])

// Huella del símbolo: bbox y eje principal (los símbolos de unifilar se
// dibujan en línea con su conductor, así que el lado largo es el eje).
const footprints = (document) => {
	const byId = new Map(document.entities.map((e) => [e.id, e]))
	return (document.symbols || [])
		.map((symbol) => {
			const box = unionBBox(symbol.entities.map((id) => byId.get(id)).filter(Boolean))
			if (!box) return null
			const w = box[2] - box[0]
			const h = box[3] - box[1]
			return { symbol, box, vertical: h >= w, span: Math.max(w, h) }
		})
		.filter(Boolean)
}

const buildGraph = (document, fixes = {}) => {
	const entities = document.entities
	const byId = new Map(entities.map((e) => [e.id, e]))
	const viewSize = viewSizeOf(entities)
	const eps = viewSize * 0.0005
	const snap = viewSize * 0.002
	const segments = toSegments(entities, eps)
	const symbols = footprints(document)
	const stats = { conductors: segments.length, tees: 0, devices: 0, unresolved: [], joined: 0 }

	// --- 1. puntos de corte de cada tramo ---
	// coincidencia de extremos, derivaciones en T y bordes de las huellas
	const cuts = new Map(segments.map((s) => [s, new Set([s.lo, s.hi])]))
	const addCut = (seg, at) => {
		if (at > seg.lo + eps && at < seg.hi - eps) cuts.get(seg).add(at)
	}
	for (const seg of segments) {
		for (const other of segments) {
			if (other === seg || other.vertical === seg.vertical) continue
			// perpendiculares: el cruce está en (fijo del uno, fijo del otro)
			const along = other.fixed
			const across = seg.fixed
			if (across < other.lo - snap || across > other.hi + snap) continue
			if (along <= seg.lo + eps || along >= seg.hi - eps) continue
			addCut(seg, along)
			stats.tees++
		}
		// extremos de tramos colineales que caen dentro de este
		for (const other of segments) {
			if (other === seg || other.vertical !== seg.vertical) continue
			if (Math.abs(other.fixed - seg.fixed) > snap) continue
			addCut(seg, other.lo)
			addCut(seg, other.hi)
		}
	}
	for (const { box, vertical } of symbols) {
		const from = vertical ? box[1] : box[0]
		const to = vertical ? box[3] : box[2]
		for (const seg of segments) {
			if (seg.vertical !== vertical) continue
			const across = seg.vertical ? box[0] : box[1]
			const acrossTo = seg.vertical ? box[2] : box[3]
			if (seg.fixed < across - snap || seg.fixed > acrossTo + snap) continue
			addCut(seg, from)
			addCut(seg, to)
		}
	}

	// --- 2. nodos y aristas de conductor ---
	const points = []
	for (const seg of segments) for (const at of cuts.get(seg)) points.push(pointOf(seg, at))
	const cluster = clusterPoints(points, snap)
	const nodes = cluster.list()
	const node = (x, y) => cluster.at(x, y)
	const inside = (seg, from, to) => {
		const mid = (from + to) / 2
		return symbols.some(({ box, vertical }) => {
			if (vertical !== seg.vertical) return false
			const lo = vertical ? box[1] : box[0]
			const hi = vertical ? box[3] : box[2]
			const across = vertical ? [box[0], box[2]] : [box[1], box[3]]
			return (
				mid > lo - eps && mid < hi + eps && seg.fixed >= across[0] - snap && seg.fixed <= across[1] + snap
			)
		})
	}
	const edges = []
	for (const seg of segments) {
		const points = [...cuts.get(seg)].sort((a, b) => a - b)
		for (let i = 0; i < points.length - 1; i++) {
			const [from, to] = [points[i], points[i + 1]]
			if (to - from < eps) continue
			// el pedazo que queda dentro de un símbolo lo reemplaza el aparato
			if (inside(seg, from, to)) continue
			const a = node(...pointOf(seg, from))
			const b = node(...pointOf(seg, to))
			if (a !== b) edges.push({ type: 'conductor', from: a, to: b, entity: seg.entity, layer: seg.layer })
		}
	}

	// --- 3. cada símbolo, una arista de dos bornes ---
	//
	// Los bornes NO se buscan por radio: se toman de la propia geometría del
	// símbolo. Los candidatos son los extremos de sus latiguillos axiales (que
	// ya son nodos del grafo, porque son tramos como cualquier otro) más los
	// nodos que caen en su huella (el corte del conductor que lo atraviesa).
	// De esos, los dos extremos sobre el eje, uno a cada lado del centro.
	// Así funcionan igual el caso "el cable atraviesa el símbolo" y el caso
	// "el cable se corta antes de llegar".
	const manual = fixes.terminals || {}
	for (const { symbol, box, vertical } of symbols) {
		const fixed = manual[symbol.id]
		if (fixed?.length === 2 && nodes.has(fixed[0]) && nodes.has(fixed[1])) {
			edges.push({
				type: 'device',
				from: fixed[0],
				to: fixed[1],
				symbol: symbol.id,
				shape: symbol.shape,
				manual: true,
			})
			stats.devices++
			continue
		}
		const candidates = new Set()
		for (const id of symbol.entities) {
			const e = byId.get(id)
			if (e?.type !== 'line') continue
			// node() devuelve null para los trazos no axiales: no son del grafo
			for (const [x, y] of [
				[e.x1, e.y1],
				[e.x2, e.y2],
			]) {
				const id = node(x, y)
				if (id) candidates.add(id)
			}
		}
		for (const n of nodes.values()) {
			if (n.x >= box[0] - snap && n.x <= box[2] + snap && n.y >= box[1] - snap && n.y <= box[3] + snap) {
				candidates.add(n.id)
			}
		}
		const along = (n) => (vertical ? n.y : n.x)
		const mid = vertical ? (box[1] + box[3]) / 2 : (box[0] + box[2]) / 2
		const list = [...candidates].map((id) => nodes.get(id)).filter(Boolean)
		const lower = list.filter((n) => along(n) < mid).sort((a, b) => along(a) - along(b))[0]
		const upper = list.filter((n) => along(n) > mid).sort((a, b) => along(b) - along(a))[0]
		if (!lower || !upper) {
			stats.unresolved.push({ symbol: symbol.id, candidates: list.length })
			continue
		}
		edges.push({ type: 'device', from: lower.id, to: upper.id, symbol: symbol.id, shape: symbol.shape })
		stats.devices++
	}

	// --- 4. correcciones a mano: unir dos nodos que el dibujo dejó separados ---
	for (const [a, b] of fixes.joins || []) {
		if (!nodes.has(a) || !nodes.has(b)) continue
		edges.push({ type: 'join', from: a, to: b, manual: true })
		stats.joined++
	}

	// --- 5. componentes conexas: la medida de si el plano cerró ---
	const parent = new Map([...nodes.keys()].map((k) => [k, k]))
	const find = (k) => {
		while (parent.get(k) !== k) {
			parent.set(k, parent.get(parent.get(k)))
			k = parent.get(k)
		}
		return k
	}
	for (const edge of edges) {
		const [a, b] = [find(edge.from), find(edge.to)]
		if (a !== b) parent.set(a, b)
	}
	const groups = new Map()
	for (const k of nodes.keys()) {
		const root = find(k)
		groups.set(root, (groups.get(root) || 0) + 1)
	}
	const sizes = [...groups.values()].sort((a, b) => b - a)
	stats.nodes = nodes.size
	stats.edges = edges.length
	stats.components = sizes.length
	stats.largest = sizes[0] || 0
	stats.coverage = nodes.size ? Number(((sizes[0] / nodes.size) * 100).toFixed(1)) : 0
	stats.islands = sizes.slice(1)

	return { nodes: [...nodes.values()], edges, stats }
}

module.exports = { buildGraph, clusterPoints }
