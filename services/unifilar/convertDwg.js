const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const path = require('node:path')
const fs = require('node:fs')
const { dwgJsonToDocument } = require('./dwgToDocument')
const { documentToSvg } = require('./documentToSvg')
const { normalizeDocument } = require('./normalizeDocument')
const { detectSymbols } = require('./detectSymbols')

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

// dwgread NO escribe UTF-8: pasa los textos del DWG a la codepage declarada en
// el FILEHEADER. Un plano en ANSI_1252 sale con el byte 0xD3 para "Ó" y 0xBA
// para "º", que leídos como UTF-8 quedan en U+FFFD (el "?" que se ve en el
// visor). Índices del enum Dwg_Codepage de LibreDWG → etiquetas de TextDecoder.
const CODEPAGES = {
	1: 'windows-1252', // US_ASCII (subconjunto de cp1252)
	2: 'windows-1252', // ISO_8859_1 (WHATWG mapea latin1 → cp1252)
	3: 'iso-8859-2',
	4: 'iso-8859-3',
	5: 'iso-8859-4',
	6: 'iso-8859-5',
	7: 'iso-8859-6',
	8: 'iso-8859-7',
	9: 'iso-8859-8',
	10: 'windows-1254', // ISO_8859_9
	22: 'shift_jis', // CP932
	23: 'macintosh',
	24: 'big5',
	25: 'euc-kr', // CP949
	27: 'ibm866', // CP866
	28: 'windows-1250',
	29: 'windows-1251',
	30: 'windows-1252', // ANSI_1252: el habitual en AutoCAD en español
	31: 'gbk', // GB2312
	32: 'windows-1253',
	33: 'windows-1254',
	34: 'windows-1255',
	35: 'windows-1256',
	36: 'windows-1257',
	37: 'windows-874',
	38: 'shift_jis', // ANSI_932
	39: 'gbk', // ANSI_936
	40: 'euc-kr', // ANSI_949
	41: 'big5', // ANSI_950
	43: 'utf-16le', // ANSI_1200
	44: 'windows-1258',
}

// TextDecoder no soporta las codepages DOS (CP437, CP850…): devuelve null.
const decodeWith = (buf, label) => {
	try {
		return new TextDecoder(label).decode(buf)
	} catch {
		return null
	}
}

// Decodifica el dump con la codepage del DWG. Toda la sintaxis JSON es ASCII,
// así que decodificar el buffer completo de una sola pasada es seguro.
const decodeDump = (buf) => {
	// El FILEHEADER va al principio del dump y es siempre ASCII.
	const head = buf.subarray(0, 4096).toString('latin1')
	const codepage = Number(head.match(/"codepage"\s*:\s*(\d+)/)?.[1])
	const decoded = CODEPAGES[codepage] ? decodeWith(buf, CODEPAGES[codepage]) : null
	if (decoded !== null) return decoded
	// Codepage desconocida o sin soporte: si el dump es UTF-8 válido lo tomamos
	// como tal, y si no caemos en cp1252, que es el caso más frecuente.
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(buf)
	} catch {
		return new TextDecoder('windows-1252').decode(buf)
	}
}

// Dump JSON completo del DWG: entidades, capas y textos con sus posiciones.
const dwgToJson = async (dwgPath) => {
	const outPath = `${dwgPath}.json`
	await execFileAsync(binary('dwgread'), ['-O', 'json', '-o', outPath, dwgPath], {
		maxBuffer: 64 * 1024 * 1024,
	})
	const raw = decodeDump(fs.readFileSync(outPath))
	fs.unlinkSync(outPath)
	return JSON.parse(raw)
}

// Resumen liviano para la columna `data`: capas y textos del plano.
// Los textos (con su id) son la ayuda para el mapeo asistido: sugieren
// qué equipo corresponde a cada zona del dibujo.
const summarizeDocument = (document, stats) => ({
	layers: document.layers.map((l) => l.name),
	texts: document.entities
		.filter((e) => e.type === 'text')
		.map((e) => ({ id: e.id, text: e.lines.join(' ') })),
	entities: document.entities.length,
	symbols: document.symbols?.length || 0,
	shapes: document.shapes?.length || 0,
	cleanup: stats,
})

// Detección de símbolos y catálogo de formas, guardados dentro del documento.
// Van con la geometría porque se derivan de ella: si el documento cambia hay
// que recalcularlos, y tenerlos al lado deja ese acoplamiento a la vista.
const withSymbols = (document) => {
	const { symbols, shapes } = detectSymbols(document)
	return { ...document, symbols, shapes }
}

// Conversión completa: DWG → documento limpio y tipificable + SVG + resumen.
const convertDwg = async (dwgPath) => {
	const dwgJson = await dwgToJson(dwgPath)
	const { document: clean, stats } = normalizeDocument(dwgJsonToDocument(dwgJson))
	const document = withSymbols(clean)
	return { document, svg: documentToSvg(document), summary: summarizeDocument(document, stats) }
}

module.exports = { converterAvailable, convertDwg, dwgToJson, decodeDump, withSymbols }
