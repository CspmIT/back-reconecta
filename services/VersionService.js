const { db } = require('../models')

/**
 * Recupera una lista de marcas y sus versiones activas desde la base de datos.
 * Solo incluye marcas cuyo estado es activo (`status: 1`).
 *
 * @returns {Promise<Array>} Un arreglo de objetos que representa las marcas activas, cada una con:
 *  - id: el identificador de la marca,
 *  - name: el nombre de la marca,
 *  - version: un array de versiones asociadas, cada una con su id y nombre.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta a la base de datos.
 * @author
 */
const getListVersions = async () => {
	try {
		const versions = await db.Brand.findAll({
			where: {
				status: 1,
			},
			attributes: ['id', 'name', 'type_device'],
			include: {
				association: 'version',
				attributes: ['id', 'name'],
			},
		})
		return versions
	} catch (error) {
		throw error
	}
}
const getersionxName = async (name) => {
	try {
		const versions = await db.Version.findOne({
			where: {
				name: name,
			},
			attributes: ['id', 'name', 'type_device'],
			include: {
				association: 'brand',
				attributes: ['id', 'name'],
			},
		})
		return versions
	} catch (error) {
		throw error
	}
}
module.exports = {
	getListVersions,
	getersionxName,
}
