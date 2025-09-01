const fs = require('fs')
const path = require('path')

const cacheDir = path.join(__dirname, '..', 'cache')
const bufferFile = path.join(cacheDir, 'influx_buffer.json')

// Asegurar que exista carpeta y archivo
if (!fs.existsSync(cacheDir)) {
	fs.mkdirSync(cacheDir, { recursive: true })
}
if (!fs.existsSync(bufferFile)) {
	fs.writeFileSync(bufferFile, '{}')
}

function loadBuffer() {
	try {
		return JSON.parse(fs.readFileSync(bufferFile, 'utf8'))
	} catch (e) {
		return {}
	}
}

function saveBuffer(buffer) {
	fs.writeFileSync(bufferFile, JSON.stringify(buffer))
}

module.exports = {
	loadBuffer,
	saveBuffer,
}
