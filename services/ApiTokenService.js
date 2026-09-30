/**
 * Tokens de la API externa (tabla `ApiTokens` de cada cooperativa).
 *
 * El token es una clave opaca y no un JWT, para poder revocarlo uno por uno sin
 * tocar el SECRET de la app. Formato:
 *
 *   rk.<schema>.<secreto>
 *
 * El schema va a la vista porque cada cooperativa tiene su propia base: sin el
 * no hay donde buscar el hash. No es un dato sensible (ya viaja en el `iss` de
 * los JWT) y sin el secreto no sirve de nada.
 *
 * Del secreto se guarda solo el sha256. Alcanza con un hash rapido y sin sal
 * porque el secreto son 32 bytes aleatorios, no una contraseña elegida por
 * alguien: no hay diccionario contra el cual probar.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */
const crypto = require('crypto')
const { Op } = require('sequelize')
const { getTenantDb } = require('../models')
const { listSchemas } = require('../utils/auditTenants')

const TOKEN_PREFIX = 'rk'

// Permisos que puede tener un token. La API es de solo lectura.
const SCOPES = {
	'equipments:read': 'Listado y detalle de equipos',
	'metrology:read': 'Metrologia instantanea e historicos',
	'events:read': 'Eventos por equipo y alarmas activas',
}

const MAX_EXPIRES_DAYS = 365

// last_used_at se actualiza como mucho una vez por minuto por token: un
// integrador que consulta cada segundo no tiene por que sumar un UPDATE a cada
// request.
const TOUCH_MS = 60 * 1000

const SAFE_SCHEMA = /^[A-Za-z0-9_]{1,64}$/

const hashSecret = (secret) => crypto.createHash('sha256').update(secret).digest('hex')

/**
 * Separa un token en schema y secreto. No consulta nada: solo valida la forma.
 *
 * @param {string} token
 * @returns {{ schema: string, secret: string } | null}
 */
const parseToken = (token) => {
	if (typeof token !== 'string') return null
	const parts = token.split('.')
	if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null
	const [, schema, secret] = parts
	if (!SAFE_SCHEMA.test(schema) || !/^[A-Za-z0-9_-]{43}$/.test(secret)) return null
	return { schema, secret }
}

/**
 * Datos publicos de un token, sin el hash.
 */
const serialize = (row) => {
	const t = row.get ? row.get({ plain: true }) : row
	return {
		id: t.id,
		name: t.name,
		token_prefix: t.token_prefix,
		scopes: t.scopes,
		expires_at: t.expires_at,
		last_used_at: t.last_used_at,
		last_ip: t.last_ip,
		revoked_at: t.revoked_at,
		status: t.revoked_at ? 'revocado' : t.expires_at && new Date(t.expires_at) <= new Date() ? 'vencido' : 'activo',
		createdAt: t.createdAt,
		user: t.user ? { id: t.user.id, name: [t.user.first_name, t.user.last_name].filter(Boolean).join(' ') } : null,
	}
}

const listTokens = async (db) => {
	const rows = await db.ApiToken.findAll({
		include: [{ model: db.User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
		order: [['createdAt', 'DESC']],
	})
	return rows.map(serialize)
}

/**
 * Crea un token y devuelve el secreto completo. Es la UNICA vez que se puede
 * ver: despues solo queda el hash.
 *
 * @param {Object} db - db del tenant
 * @param {Object} params
 * @param {string} params.name
 * @param {string[]} params.scopes
 * @param {number|null} [params.expires_in_days] - null o ausente = no vence
 * @param {Object} params.user - req.user de quien lo crea
 * @returns {Promise<{ token: string, data: Object }>}
 */
const createToken = async (db, { name, scopes, expires_in_days: expiresInDays, user }) => {
	const cleanName = typeof name === 'string' ? name.trim() : ''
	if (!cleanName || cleanName.length > 100) throw new Error('El nombre es obligatorio y admite hasta 100 caracteres')

	if (!Array.isArray(scopes) || !scopes.length) throw new Error('Hay que elegir al menos un permiso')
	const invalidos = scopes.filter((s) => !SCOPES[s])
	if (invalidos.length) throw new Error(`Permisos desconocidos: ${invalidos.join(', ')}`)

	let expiresAt = null
	if (expiresInDays !== undefined && expiresInDays !== null && expiresInDays !== '') {
		const days = Number(expiresInDays)
		if (!Number.isInteger(days) || days < 1 || days > MAX_EXPIRES_DAYS)
			throw new Error(`El vencimiento debe ser un entero de dias entre 1 y ${MAX_EXPIRES_DAYS}`)
		expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
	}

	// Sin influx_name el token no podria leer mediciones. Viene del login de
	// Cooptech: si falta, el problema es la sesion, no el pedido.
	if (!user?.influx_name) throw new Error('La sesion no tiene base de Influx asociada; volvé a ingresar')
	if (!SAFE_SCHEMA.test(user.schema || '')) throw new Error('El schema de la sesion no es valido para generar tokens')

	const secret = crypto.randomBytes(32).toString('base64url')
	const row = await db.ApiToken.create({
		name: cleanName,
		token_prefix: secret.slice(0, 8),
		token_hash: hashSecret(secret),
		influx_name: user.influx_name,
		scopes: [...new Set(scopes)],
		expires_at: expiresAt,
		id_user: user.id,
	})

	return { token: `${TOKEN_PREFIX}.${user.schema}.${secret}`, data: serialize(row) }
}

const revokeToken = async (db, id) => {
	const row = await db.ApiToken.findByPk(id)
	if (!row) return null
	if (!row.revoked_at) await row.update({ revoked_at: new Date() })
	return serialize(row)
}

/**
 * Resuelve el token de un request externo.
 *
 * El schema se valida contra la lista de cooperativas ANTES de abrir la
 * conexion: getTenantDb cachea una instancia de Sequelize por nombre, y con un
 * nombre inventado por cada request se llenaria la memoria de conexiones.
 *
 * @param {string} token
 * @returns {Promise<{ db: Object, schema: string, apiToken: Object } | { error: string }>}
 */
const resolveToken = async (token) => {
	const parsed = parseToken(token)
	if (!parsed) return { error: 'Token con formato invalido' }

	const schemas = await listSchemas(await getTenantDb())
	if (!schemas.includes(parsed.schema)) return { error: 'Token invalido' }

	const db = await getTenantDb(parsed.schema)
	if (!db.ApiToken) return { error: 'Token invalido' }

	const apiToken = await db.ApiToken.findOne({
		where: {
			token_hash: hashSecret(parsed.secret),
			revoked_at: null,
			[Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
		},
	})
	if (!apiToken) return { error: 'Token invalido, vencido o revocado' }

	return { db, schema: parsed.schema, apiToken }
}

/**
 * Registra el uso del token sin frenar el request.
 */
const touchToken = (apiToken, ip) => {
	const last = apiToken.last_used_at ? new Date(apiToken.last_used_at).getTime() : 0
	if (Date.now() - last < TOUCH_MS) return
	apiToken
		.update({ last_used_at: new Date(), last_ip: ip ? String(ip).slice(0, 45) : null }, { silent: true })
		.catch((e) => console.error(`No se pudo registrar el uso del token ${apiToken.id}:`, e.message))
}

module.exports = {
	SCOPES,
	MAX_EXPIRES_DAYS,
	parseToken,
	listTokens,
	createToken,
	revokeToken,
	resolveToken,
	touchToken,
}
