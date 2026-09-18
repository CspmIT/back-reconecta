const { getFirmwares, keyPermitida, streamBinario, registrarEvento, listarEventos } = require('../services/AutonomiaService')

/**
 * Catálogo de firmwares para el instalador: solo releases aprobados por
 * ingeniería y de producto Reconecta/General.
 */
const firmwares = async (req, res) => {
	try {
		return res.status(200).json(await getFirmwares())
	} catch (e) {
		return res.status(502).json({ message: e.message })
	}
}

/**
 * Proxy del binario: el frontend nunca ve las credenciales del storage y solo
 * puede pedir keys que figuran en el catálogo visible.
 */
const binario = async (req, res) => {
	try {
		const key = String(req.query.key || req.params.key || '')
		if (!key || !(await keyPermitida(key))) {
			return res.status(404).json({ message: 'El archivo no pertenece a ningún release publicado' })
		}
		const upstream = await streamBinario(key)
		res.setHeader('Content-Type', 'application/octet-stream')
		if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length'])
		res.setHeader('Cache-Control', 'private, max-age=300')
		upstream.data.on('error', () => res.destroy())
		return upstream.data.pipe(res)
	} catch (e) {
		const status = e.response?.status === 404 ? 404 : 502
		return res.status(status).json({ message: e.response?.status ? `Storage respondió ${e.response.status}` : e.message })
	}
}

const eventos = async (req, res) => {
	try {
		return res.status(200).json({ eventos: await listarEventos(req.db, req.query.limit) })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const nuevoEvento = async (req, res) => {
	try {
		const row = await registrarEvento(req.db, req.user, req.body || {})
		return res.status(201).json({ id: row.id })
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

module.exports = { firmwares, binario, eventos, nuevoEvento }
