const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const path = require('node:path')
const fs = require('node:fs')
const { dwgJsonToDocument } = require('./dwgToDocument')
const { documentToSvg } = require('./documentToSvg')

const execFileAsync = promisify(execFile)

// Directorio con los binarios de LibreDWG (dwgread, dwg2dxf).
// Se configura por .env; si no está, la conversión queda pendiente y el
// plano se guarda igual para procesarlo después.
const LIBREDWG_PATH = process.env.LIBREDWG_PATH || ''

const binary = (name) => (LIBREDWG_PATH ? path.join(LIBREDWG_PATH, name) : name)

const converterAvailable = () => {
	if (!LIBREDWG_PATH) return false
	return fs.existsSync(binary('dwgread'))
}

// Dump JSON completo del DWG: entidades, capas y textos con sus posiciones.
const dwgToJson = async (dwgPath) => {
	const outPath = `${dwgPath}.json`
	await execFileAsync(binary('dwgread'), ['-O', 'json', '-o', outPath, dwgPath], {
		maxBuffer: 64 * 1024 * 1024,
	})
	const raw = fs.readFileSync(outPath, 'utf-8')
	fs.unlinkSync(outPath)
	return JSON.parse(raw)
}

// Resumen liviano para la columna `data`: capas y textos del plano.
// Los textos (con su id) son la ayuda para el mapeo asistido: sugieren
// qué equipo corresponde a cada zona del dibujo.
const summarizeDocument = (document) => ({
	layers: document.layers.map((l) => l.name),
	texts: document.entities
		.filter((e) => e.type === 'text')
		.map((e) => ({ id: e.id, text: e.lines.join(' ') })),
	entities: document.entities.length,
})

// Conversión completa: DWG → documento editable + SVG + resumen.
const convertDwg = async (dwgPath) => {
	const dwgJson = await dwgToJson(dwgPath)
	const document = dwgJsonToDocument(dwgJson)
	return { document, svg: documentToSvg(document), summary: summarizeDocument(document) }
}

module.exports = { converterAvailable, convertDwg, dwgToJson }
