require('dotenv').config()
const crypto = require('crypto')
// Generar una clave a partir de la contraseña
const algorithm = 'aes-256-cbc' // Algoritmo de cifrado
const iv = crypto.randomBytes(16) // Generar un vector de inicialización (IV)

// Función para encriptar
const encrypt = async (text) => {
	const key = crypto.scryptSync(process.env.SECRET, 'salt', 32) // Generar clave de 32 bytes
	const cipher = crypto.createCipheriv(algorithm, key, iv)
	let encrypted = cipher.update(text, 'utf8', 'hex')
	encrypted += cipher.final('hex')
	return { iv: iv.toString('hex'), content: encrypted }
}

// Función para desencriptar
const decrypt = (encrypted) => {
	const key = crypto.scryptSync(process.env.SECRET, 'salt', 32) // Generar clave de 32 bytes
	const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(encrypted.iv, 'hex'))
	let decrypted = decipher.update(encrypted.content, 'hex', 'utf8')
	decrypted += decipher.final('utf8')
	return decrypted
}

module.exports = { encrypt, decrypt }
