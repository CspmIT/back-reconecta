const { db } = require('../models')

/**
 * Obtiene todos los reconectadores de la base de datos de Desarrollo.
 *
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan todos los reconectadores encontrados, o lanza un error si no se encuentra ninguno.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const getListVariables = async () => {
	try {
		const Variables = await db.Variables.findAll({ where: { status: 1 } })
		if (!Variables) throw new Error('No existe ningun reconectador')
		return Variables.map((variable) => variable.get({ plain: true }))
	} catch (error) {
		throw error
	}
}

module.exports = {
	getListVariables,
}
