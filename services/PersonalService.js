const getAllPersonal = async (db) => {
	try {
		return await db.Personal.findAll({
			order: [
				['first_name', 'ASC'],
				['last_name', 'ASC'],
			],
		})
	} catch (e) {
		console.error('Error al obtener personal:', e)
		throw new Error(e)
	}
}

const createPersonal = async (db, data) => {
	try {
		const { first_name, last_name, rol = null } = data || {}
		if (!first_name || !last_name) {
			throw new Error('first_name y last_name son obligatorios')
		}
		return await db.Personal.create({
			first_name: String(first_name).trim(),
			last_name: String(last_name).trim(),
			rol: rol ? String(rol).trim() : null,
		})
	} catch (e) {
		console.error('Error al crear personal:', e)
		throw e
	}
}

module.exports = {
	getAllPersonal,
	createPersonal,
}
