const getAllBinnacles = async (db, filter = null) => {
	try {
		const query = {
			include: [
				{
					model: db.Element,
					as: 'element',
				},
			],
			where: {
				status: { [db.Sequelize.Op.ne]: 'deleted' },
			},
		}

		if (filter?.id) {
			query.where.id = filter.id
		}

		return await db.Binnacle.findAll(query)
	} catch (e) {
		console.error('Error al obtener las bitácoras:', e)
		throw new Error(e)
	}
}

const saveBinnacle = async (db, data) => {
	try {
		const maxOrder = await db.Binnacle.max('order')
		const nextOrder = maxOrder ? maxOrder + 1 : 1
		data.order = nextOrder

		return await db.Binnacle.create(data)
	} catch (e) {
		console.log(e)
		throw e
	}
}

const updateStatusToDeleted = async (db, id) => {
	try {
		const currentDate = new Date().toISOString()

		const binnacle = await db.Binnacle.findByPk(id)
		if (!binnacle) {
			throw new Error('Registro no encontrado')
		}

		await binnacle.update({
			status: 'deleted',
			updatedAt: currentDate,
		})

		return binnacle
	} catch (e) {
		console.error('Error al actualizar el estado de la bitácora:', e)
		throw new Error(e)
	}
}

module.exports = {
	getAllBinnacles,
	saveBinnacle,
	updateStatusToDeleted,
}
