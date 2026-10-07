const { provisionSchema } = require('../services/ProvisionService')
const { provisionInfluxBucket } = require('../services/InfluxProvisionService')

/**
 * Alta de un cliente nuevo: crea el schema (si no existe) y le corre todas las
 * migraciones y seeders. Lo llama el software administrativo.
 *
 * Body: { schema: 'reconecta_nuevo' }
 */
const provisionClient = async (req, res) => {
	try {
		const result = await provisionSchema(req.body?.schema)
		return res.status(result.created ? 201 : 200).json(result)
	} catch (error) {
		console.error('Alta de cliente fallida:', error.message)
		return res.status(error.status || 500).json({ error: error.message, log: error.log })
	}
}

/**
 * Crea (o reusa) el bucket de Influx de un schema y le genera un token de solo
 * lectura, que queda cifrado en client_products. Se puede reintentar.
 *
 * Body: { schema: 'reconecta_nuevo', bucket?: 'reconecta_nuevo', retentionDays?: 0, rotateToken?: false }
 */
const createInfluxBucket = async (req, res) => {
	try {
		const { schema, bucket, retentionDays, rotateToken } = req.body || {}
		const result = await provisionInfluxBucket(schema, { bucket, retentionDays, rotateToken: rotateToken === true })
		return res.status(result.bucketCreated ? 201 : 200).json(result)
	} catch (error) {
		console.error('Alta de bucket de Influx fallida:', error.message)
		return res.status(error.status || 500).json({ error: error.message })
	}
}

module.exports = { provisionClient, createInfluxBucket }
