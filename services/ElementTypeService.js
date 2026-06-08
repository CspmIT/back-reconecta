const getElementTypes = async (db) => {
	return db.ElementType.findAll({
		include: [{ model: db.ElementTypeAbrev, as: 'abrevs' }],
		order: [['id', 'ASC']],
	})
}

const buildAbrevRows = (id_type, abrevs = []) =>
	abrevs
		.map((a) => (typeof a === 'string' ? a : a?.abrev))
		.map((a) => (a || '').trim())
		.filter(Boolean)
		.map((abrev) => ({ id_type, abrev }))

const saveElementType = async (db, data) => {
	const transaction = await db.sequelize.transaction()
	try {
		const type = await db.ElementType.create(
			{ name: data.name, status: data.status ?? true },
			{ transaction }
		)
		const rows = buildAbrevRows(type.id, data.abrevs)
		if (rows.length > 0) {
			await db.ElementTypeAbrev.bulkCreate(rows, { transaction })
		}
		await transaction.commit()
		return type
	} catch (e) {
		await transaction.rollback()
		throw e
	}
}

const updateElementType = async (db, data) => {
	const transaction = await db.sequelize.transaction()
	try {
		const type = await db.ElementType.findByPk(data.id)
		if (!type) throw new Error('Tipo de elemento no encontrado')
		await type.update({ name: data.name, status: data.status ?? type.status }, { transaction })

		// Sincronización simple: se borran todas las abreviaturas y se recrean
		// desde el payload (cubre alta/baja/edición de forma uniforme).
		await db.ElementTypeAbrev.destroy({ where: { id_type: type.id }, transaction })
		const rows = buildAbrevRows(type.id, data.abrevs)
		if (rows.length > 0) {
			await db.ElementTypeAbrev.bulkCreate(rows, { transaction })
		}
		await transaction.commit()
		return type
	} catch (e) {
		await transaction.rollback()
		throw e
	}
}

const removeElementType = async (db, id) => {
	const inUse = await db.Element.count({ where: { type: id } })
	if (inUse > 0) {
		throw new Error('No se puede eliminar: hay elementos usando este tipo')
	}
	const transaction = await db.sequelize.transaction()
	try {
		await db.ElementTypeAbrev.destroy({ where: { id_type: id }, transaction })
		await db.ElementType.destroy({ where: { id }, transaction })
		await transaction.commit()
	} catch (e) {
		await transaction.rollback()
		throw e
	}
}

module.exports = {
	getElementTypes,
	saveElementType,
	updateElementType,
	removeElementType,
}
