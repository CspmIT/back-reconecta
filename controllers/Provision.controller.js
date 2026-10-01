const { provisionSchema } = require('../services/ProvisionService')

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

module.exports = { provisionClient }
