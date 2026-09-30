/**
 * Lista los mapas activos (status = 1), para el selector de mapa del alta de
 * elementos. Los dados de baja no se ofrecen: vincular un elemento nuevo a uno
 * de ellos lo dejaria fuera del mapa operativo, que solo lee la vista activa.
 *
 * @param {Object} db - Conexion del tenant.
 * @returns {Promise<Array>} Los mapas activos, por id.
 * @author Jose Romani <jose.romani@hotmail.com>
 */
const getListMaps = async (db) => {
	const dataResult = await db.MapLocation.findAll({ where: { status: 1 }, order: [['id', 'ASC']] })
	return dataResult
}

module.exports = {
	getListMaps,
}
