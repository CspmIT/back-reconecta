// AutonomIA en Reconecta: catálogo de firmwares, binarios e inventario.
//
// El catálogo lo publica y aprueba ingeniería desde el Tablero Cooptech
// (módulo AutonomIA → «Gestión de versiones»): un JSON con un manifiesto por
// release. Reconecta NO lo edita: lo lee, lo filtra (solo aprobados y de
// producto Reconecta/General) y sirve los binarios por proxy para que las
// credenciales del storage no viajen en el bundle del frontend.
//
// Variables de entorno (ver docs/AUTONOMIA.md):
//   AUTONOMIA_CATALOG_URL    URL que devuelve { firmwares: [...] }: el endpoint
//                            GET /api/catalogo/firmwares del backend del Tablero,
//                            que es público con API key y devuelve SOLO los
//                            releases aprobados. Ojo: NO es /api/multivac/firmwares
//                            (ese exige un JWT de usuario del Tablero).
//   AUTONOMIA_CATALOG_TOKEN  Bearer para esa URL: la API key del Tablero
//                            (su variable FIRMWARES_API_KEY). Sin token, ese
//                            endpoint responde 401.
//   AUTONOMIA_CATALOG_FILE   Alternativa: ruta a un JSON local con el mismo
//                            formato (exportado del Tablero). Si están las dos,
//                            manda la URL y el archivo es fallback.
//   AUTONOMIA_PRODUCTOS      Productos visibles, separados por coma
//                            (default: "Reconecta,General").
//   AUTONOMIA_MINIO_BUCKET   Bucket donde el Tablero sube los .bin (default "tablero").
//
// El gateway y las credenciales se toman de las variables que el back ya usa
// para el storage (STORAGE_URL / MINIO_ACCESS / MINIO_SECRET, modulo unifilar):
// es el mismo storageov. Solo hace falta AUTONOMIA_MINIO_URL / _ACCESS / _SECRET
// si las llaves de Reconecta no tienen permiso sobre el bucket del Tablero.
const fs = require('fs/promises')
const axios = require('axios')

const CACHE_MS = 60 * 1000
const PRODUCTOS = (process.env.AUTONOMIA_PRODUCTOS || 'Reconecta,General')
	.split(',')
	.map((p) => p.trim())
	.filter(Boolean)

const MINIO_URL = (process.env.AUTONOMIA_MINIO_URL || process.env.STORAGE_URL || 'https://storageov.cooptech.com.ar').replace(
	/\/+$/,
	''
)
// Ojo: el bucket NO cae a MINIO_BUCKET (ese es 'reconecta'); los .bin los sube
// el Tablero a su propio bucket.
const MINIO_BUCKET = process.env.AUTONOMIA_MINIO_BUCKET || 'tablero'
const MINIO_ACCESS = process.env.AUTONOMIA_MINIO_ACCESS || process.env.MINIO_ACCESS
const MINIO_SECRET = process.env.AUTONOMIA_MINIO_SECRET || process.env.MINIO_SECRET

let cache = { at: 0, firmwares: [], origen: '' }

const hexOk = (v) => /^0x[0-9a-fA-F]{1,8}$/.test(String(v || '').trim())

/**
 * Normaliza un manifiesto del Tablero a lo que el frontend de Reconecta
 * necesita. Se descartan releases sin segmentos válidos.
 */
const normalizar = (f) => {
	const bin = (b) =>
		b?.key
			? {
					key: String(b.key).trim(),
					nombre: String(b.nombre || '').slice(0, 160),
					tamano: b.tamano != null ? Number(b.tamano) : null,
					sha256: /^[0-9a-f]{64}$/.test(b.sha256) ? b.sha256 : null,
				}
			: null
	const segmentos = (Array.isArray(f?.segmentos) ? f.segmentos : [])
		.map((sg) => ({ ...bin(sg), offset: String(sg?.offset || '').trim() }))
		.filter((sg) => sg.key && hexOk(sg.offset))
	return {
		modelo: String(f?.modelo || '').trim(),
		chip: String(f?.chip || 'esp32'),
		producto: String(f?.producto || 'General'),
		version: String(f?.version || '').trim(),
		nombre: String(f?.nombre || '').trim(),
		notas: String(f?.notas || '').trim(),
		aprobado: f?.aprobado === true,
		fecha: f?.fecha || null,
		flash: {
			mode: String(f?.flash?.mode || 'keep'),
			freq: String(f?.flash?.freq || 'keep'),
			size: String(f?.flash?.size || 'keep'),
		},
		segmentos,
		merged: bin(f?.merged),
	}
}

const leerOrigen = async () => {
	const url = process.env.AUTONOMIA_CATALOG_URL
	const file = process.env.AUTONOMIA_CATALOG_FILE
	if (url) {
		try {
			const headers = process.env.AUTONOMIA_CATALOG_TOKEN ? { Authorization: `Bearer ${process.env.AUTONOMIA_CATALOG_TOKEN}` } : {}
			const { data } = await axios.get(url, { headers, timeout: 10000 })
			const lista = Array.isArray(data?.firmwares) ? data.firmwares : Array.isArray(data) ? data : []
			return { lista, origen: 'tablero' }
		} catch (e) {
			if (!file) throw new Error(`No se pudo leer el catálogo del Tablero: ${e.message}`)
			console.error('AutonomIA: catálogo remoto no disponible, se usa el archivo local:', e.message)
		}
	}
	if (file) {
		const raw = JSON.parse(await fs.readFile(file, 'utf8'))
		const lista = Array.isArray(raw?.firmwares) ? raw.firmwares : Array.isArray(raw) ? raw : []
		return { lista, origen: 'archivo' }
	}
	throw new Error('Catálogo de firmwares no configurado (AUTONOMIA_CATALOG_URL o AUTONOMIA_CATALOG_FILE)')
}

/**
 * Catálogo completo normalizado (con cache de 60 s). Incluye no aprobados:
 * el filtro público lo aplica getFirmwares.
 */
const getCatalogo = async (forzar = false) => {
	if (!forzar && Date.now() - cache.at < CACHE_MS && cache.firmwares.length) return cache
	const { lista, origen } = await leerOrigen()
	const firmwares = lista.map(normalizar).filter((f) => f.modelo && f.version && (f.segmentos.length || f.merged))
	cache = { at: Date.now(), firmwares, origen }
	return cache
}

/**
 * Lo que ve el instalador: aprobados y de los productos habilitados.
 */
const getFirmwares = async () => {
	const { firmwares, origen } = await getCatalogo()
	return {
		origen,
		productos: PRODUCTOS,
		firmwares: firmwares.filter((f) => f.aprobado && PRODUCTOS.includes(f.producto)),
	}
}

/**
 * Solo se sirven binarios que pertenecen a un release del catálogo visible
 * (evita usar el proxy para leer cualquier objeto del bucket).
 */
const keyPermitida = async (key) => {
	// Forma esperada de la key (saveImage del Tablero): nombre plano, sin
	// subcarpetas ni saltos. Los 'release:<release>/<path>' de archivos pesados
	// no se sirven por aca: se descargan del gateway sin credenciales.
	if (/[/\\]/.test(key) || key.includes('..')) return false
	const { firmwares } = await getFirmwares()
	return firmwares.some((f) => f.segmentos.some((sg) => sg.key === key) || f.merged?.key === key)
}

/**
 * Stream del binario desde el gateway del storage, con las credenciales del
 * servidor. Devuelve la respuesta axios (stream) para que el controller la
 * encadene.
 */
const streamBinario = async (key) => {
	if (!MINIO_ACCESS || !MINIO_SECRET) {
		throw new Error('Storage de firmwares no configurado (MINIO_ACCESS / MINIO_SECRET)')
	}
	return axios({
		method: 'GET',
		url: `${MINIO_URL}/minio/getImg/${MINIO_BUCKET}/${encodeURIComponent(key)}`,
		responseType: 'stream',
		timeout: 60000,
		headers: {
			accesskey: MINIO_ACCESS,
			secretkey: MINIO_SECRET,
			Accept: 'application/octet-stream',
		},
	})
}

// ---------------------------------------------------------------------------
// Inventario: qué placa quedó con qué firmware / configuración y quién lo hizo.
// ---------------------------------------------------------------------------
const TIPOS = ['flash', 'config']
const RESULTADOS = ['ok', 'error', 'abortado']

const registrarEvento = async (db, user, body) => {
	const tipo = TIPOS.includes(body?.tipo) ? body.tipo : null
	if (!tipo) throw new Error('tipo inválido (flash | config)')
	const s = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n))
	return db.AutonomiaEvent.create({
		id_user: user.id,
		tipo,
		modo: s(body.modo, 20),
		modelo: s(body.modelo, 80),
		version: s(body.version, 40),
		chip: s(body.chip, 40),
		mac: s(body.mac, 32),
		nombre_equipo: s(body.nombre_equipo, 80),
		resultado: RESULTADOS.includes(body.resultado) ? body.resultado : 'error',
		detalle: s(body.detalle, 500),
	})
}

const listarEventos = async (db, limit = 20) => {
	const rows = await db.AutonomiaEvent.findAll({
		order: [['createdAt', 'DESC']],
		limit: Math.min(Math.max(Number(limit) || 20, 1), 200),
		include: [{ model: db.User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'], required: false }],
	})
	return rows.map((r) => {
		const j = r.toJSON()
		const u = j.user || {}
		return { ...j, user: undefined, usuario: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || null }
	})
}

module.exports = { getCatalogo, getFirmwares, keyPermitida, streamBinario, registrarEvento, listarEventos }
