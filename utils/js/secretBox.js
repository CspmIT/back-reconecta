const crypto = require('crypto')

/**
 * Cifrado de secretos que se guardan en la base (por ahora, los tokens de
 * Influx de cooptech.client_products).
 *
 * AES-256-GCM con IV aleatorio por cada cifrado: el mismo token cifrado dos
 * veces da textos distintos, y si alguien toca el valor guardado el descifrado
 * falla en vez de devolver basura. Se guarda como un solo string:
 *   v1.<iv>.<tag>.<cifrado>   (cada parte en base64url)
 *
 * La clave sale de INFLUX_TOKEN_KEY: 32 bytes en hex (64 caracteres). Se genera con
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Si se pierde o se cambia, hay que volver a cargar todos los tokens.
 */
const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v1'

const getKey = () => {
	const hex = process.env.INFLUX_TOKEN_KEY || ''
	if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
		throw new Error('INFLUX_TOKEN_KEY no esta definida o no tiene 64 caracteres hex')
	}
	return Buffer.from(hex, 'hex')
}

const seal = (plain) => {
	const iv = crypto.randomBytes(12)
	const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
	const content = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
	const tag = cipher.getAuthTag()
	return [VERSION, iv, tag, content].map((p) => (Buffer.isBuffer(p) ? p.toString('base64url') : p)).join('.')
}

const open = (sealed) => {
	const [version, iv, tag, content] = String(sealed).split('.')
	if (version !== VERSION || !iv || !tag || !content) throw new Error('Formato de secreto cifrado invalido')
	const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'base64url'))
	decipher.setAuthTag(Buffer.from(tag, 'base64url'))
	return Buffer.concat([decipher.update(Buffer.from(content, 'base64url')), decipher.final()]).toString('utf8')
}

module.exports = { seal, open }
