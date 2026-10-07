const { InfluxDB, HttpError } = require('@influxdata/influxdb-client')
const { BucketsAPI, AuthorizationsAPI } = require('@influxdata/influxdb-client-apis')
const config_influx = require('../config/config_influx.js')
const { findClientProduct, saveInfluxAccess, hasColumn } = require('./InfluxConfigService')

/**
 * Alta del espacio propio de un schema en Influx:
 *  1. Busca el bucket por nombre en la org; si no existe lo crea.
 *  2. Crea un token de SOLO LECTURA sobre ese bucket (Reconecta no escribe en Influx).
 *  3. Guarda bucket y token (cifrado) en cooptech.client_products.
 *  4. Revoca los tokens que Reconecta haya creado antes para ese schema.
 *
 * Se puede reintentar: si el bucket ya existe se reusa, y si el schema ya tiene
 * token para ese mismo bucket no se crea otro (salvo rotateToken).
 *
 * Crear buckets y tokens necesita un token con permisos de administracion en la
 * org: INFLUX_ADMIN_TOKEN_<INFLUX_NAME> (ej. INFLUX_ADMIN_TOKEN_MORTEROS_ENERGIA).
 * Si no esta definido se usa el token general de config_influx.
 */
const BUCKET_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/
// Prefijo de la descripcion de los tokens que crea Reconecta: permite encontrarlos para revocarlos.
const tokenDescription = (schema, bucket) => `reconecta:${schema}:${bucket}`

const running = new Set()

class InfluxProvisionError extends Error {
	constructor(message, status) {
		super(message)
		this.status = status
	}
}

const adminClient = (influxName) => {
	const base = config_influx[influxName]
	if (!base) throw new InfluxProvisionError(`No hay configuracion de Influx para "${influxName}"`, 400)
	const token = process.env[`INFLUX_ADMIN_TOKEN_${influxName.toUpperCase()}`] || base.INFLUXDB_TOKEN
	const influx = new InfluxDB({ url: base.INFLUX_URL, token })
	return { orgID: base.INFLUX_ORG_ID, buckets: new BucketsAPI(influx), auths: new AuthorizationsAPI(influx) }
}

const findOrCreateBucket = async ({ buckets, orgID }, name, retentionDays) => {
	try {
		const { buckets: found } = await buckets.getBuckets({ orgID, name })
		if (found?.length) return { bucket: found[0], created: false }
	} catch (e) {
		// Influx responde 404 cuando no hay ningun bucket con ese nombre.
		if (e.statusCode !== 404) throw e
	}
	const bucket = await buckets.postBuckets({
		body: {
			orgID,
			name,
			description: 'Creado por Reconecta',
			retentionRules: retentionDays > 0 ? [{ type: 'expire', everySeconds: retentionDays * 86400 }] : [],
		},
	})
	return { bucket, created: true }
}

const createReadToken = ({ auths, orgID }, schema, bucket) =>
	auths.postAuthorizations({
		body: {
			orgID,
			description: tokenDescription(schema, bucket.name),
			permissions: [{ action: 'read', resource: { type: 'buckets', id: bucket.id, orgID } }],
		},
	})

const revokePreviousTokens = async ({ auths, orgID }, schema, keepId) => {
	const { authorizations = [] } = await auths.getAuthorizations({ orgID })
	const old = authorizations.filter((a) => a.id !== keepId && a.description?.startsWith(`reconecta:${schema}:`))
	await Promise.all(old.map((a) => auths.deleteAuthorizationsID({ authID: a.id })))
	return old.length
}

/**
 * @param {string} schema - schema_name en client_products.
 * @param {object} [options]
 * @param {string} [options.bucket] - Nombre del bucket. Default: el que ya tenga la fila, o el schema.
 * @param {number} [options.retentionDays] - Solo al crear el bucket. 0 = sin vencimiento.
 * @param {boolean} [options.rotateToken] - Crear un token nuevo aunque ya haya uno valido.
 */
const provisionInfluxBucket = async (schema, options = {}) => {
	if (!schema || typeof schema !== 'string') throw new InfluxProvisionError('Falta el schema', 400)
	const retentionDays = Number(options.retentionDays ?? process.env.INFLUX_BUCKET_RETENTION_DAYS ?? 0)
	if (!Number.isInteger(retentionDays) || retentionDays < 0) {
		throw new InfluxProvisionError('retentionDays tiene que ser un entero >= 0', 400)
	}
	if (running.has(schema)) throw new InfluxProvisionError(`Ya hay un alta de Influx en curso para ${schema}`, 409)
	running.add(schema)

	try {
		// Se valida todo lo de la base antes de tocar Influx.
		const row = await findClientProduct(schema)
		if (!row) throw new InfluxProvisionError(`No hay producto en client_products con schema_name = ${schema}`, 404)
		if (!(await hasColumn('influx_bucket'))) {
			throw new InfluxProvisionError('Falta la columna influx_bucket en client_products', 409)
		}
		if (!row.influx_name) throw new InfluxProvisionError(`La fila de ${schema} no tiene influx_name`, 409)

		const bucketName = options.bucket || row.influx_bucket || schema
		if (!BUCKET_RE.test(bucketName)) {
			throw new InfluxProvisionError('Nombre de bucket invalido: letras, numeros, guion y guion bajo (max 64)', 400)
		}

		const admin = adminClient(row.influx_name)
		const { bucket, created } = await findOrCreateBucket(admin, bucketName, retentionDays)

		const sameBucket = row.influx_bucket === bucket.name
		if (row.influx_token && sameBucket && !options.rotateToken) {
			return { schema, bucket: bucket.name, bucketCreated: created, tokenCreated: false, tokensRevoked: 0 }
		}

		const auth = await createReadToken(admin, schema, bucket)
		try {
			await saveInfluxAccess(schema, { bucket: bucket.name, token: auth.token })
		} catch (e) {
			// Sin guardar, el token nuevo no lo usa nadie: se borra para no dejarlo suelto.
			await admin.auths.deleteAuthorizationsID({ authID: auth.id }).catch(() => {})
			throw e
		}
		const tokensRevoked = await revokePreviousTokens(admin, schema, auth.id).catch((e) => {
			console.error(`InfluxProvision: no se pudieron revocar tokens viejos de ${schema} ->`, e.message)
			return null
		})
		return { schema, bucket: bucket.name, bucketCreated: created, tokenCreated: true, tokensRevoked }
	} catch (e) {
		if (!(e instanceof HttpError)) throw e
		// Errores de la API de Influx (401/403 si el token admin no alcanza, 422 si el nombre choca, ...).
		throw new InfluxProvisionError(`Influx respondio ${e.message}`, e.statusCode === 422 ? 400 : 502)
	} finally {
		running.delete(schema)
	}
}

module.exports = { provisionInfluxBucket, InfluxProvisionError }
