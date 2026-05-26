const getAllBinnacles = async (db, filter = null) => {
	try {
		const query = {
			include: [
				{ model: db.Element, as: 'element' },
				{ model: db.Equipment, as: 'equipment' },
				{ model: db.Binnacle_pictures, as: 'pictures' },
				{
					model: db.User,
					as: 'users',
					through: { attributes: [] },
				},
			],
			where: {},
			order: [['date_task', 'DESC']],
		}

		if (filter?.id) {
			query.where.id = filter.id
		}
		if (filter?.id_element) {
			query.where.id_element = filter.id_element
		}
		if (filter?.id_equipment) {
			query.where.id_equipment = filter.id_equipment
		}
		if (filter?.status_task) {
			query.where.status_task = filter.status_task
		}
		if (filter?.type_task) {
			query.where.type_task = filter.type_task
		}

		return await db.Binnacle.findAll(query)
	} catch (e) {
		console.error('Error al obtener las bitácoras:', e)
		throw new Error(e)
	}
}

const saveBinnacle = async (db, data) => {
	const t = await db.sequelize.transaction()
	try {
		const { users = [], pictures = [], ...binnacleData } = data

		const binnacle = await db.Binnacle.create(binnacleData, { transaction: t })

		if (users.length) {
			const userRows = users.map((id_user) => ({
				id_binnacle: binnacle.id,
				id_user,
			}))
			await db.Binnacle_users.bulkCreate(userRows, { transaction: t })
		}

		if (pictures.length) {
			const pictureRows = pictures.map((p) => ({
				id_binnacle: binnacle.id,
				name_file: p.name_file,
				type: p.type,
			}))
			await db.Binnacle_pictures.bulkCreate(pictureRows, { transaction: t })
		}

		await t.commit()
		return binnacle
	} catch (e) {
		await t.rollback()
		console.error('Error al guardar la bitácora:', e)
		throw e
	}
}

const updateBinnacle = async (db, id, data) => {
	const t = await db.sequelize.transaction()
	try {
		const binnacle = await db.Binnacle.findByPk(id, { transaction: t })
		if (!binnacle) {
			throw new Error('Registro no encontrado')
		}

		const { users, pictures, ...binnacleData } = data
		await binnacle.update(binnacleData, { transaction: t })

		if (Array.isArray(users)) {
			await db.Binnacle_users.destroy({
				where: { id_binnacle: id },
				transaction: t,
			})
			if (users.length) {
				const userRows = users.map((id_user) => ({
					id_binnacle: id,
					id_user,
				}))
				await db.Binnacle_users.bulkCreate(userRows, { transaction: t })
			}
		}

		if (Array.isArray(pictures)) {
			await db.Binnacle_pictures.destroy({
				where: { id_binnacle: id },
				transaction: t,
			})
			if (pictures.length) {
				const pictureRows = pictures.map((p) => ({
					id_binnacle: id,
					name_file: p.name_file,
					type: p.type,
				}))
				await db.Binnacle_pictures.bulkCreate(pictureRows, { transaction: t })
			}
		}

		await t.commit()
		return binnacle
	} catch (e) {
		await t.rollback()
		console.error('Error al actualizar la bitácora:', e)
		throw e
	}
}

const deleteBinnacle = async (db, id) => {
	const t = await db.sequelize.transaction()
	try {
		const binnacle = await db.Binnacle.findByPk(id, { transaction: t })
		if (!binnacle) {
			throw new Error('Registro no encontrado')
		}

		await db.Binnacle_users.destroy({
			where: { id_binnacle: id },
			transaction: t,
		})
		await db.Binnacle_pictures.destroy({
			where: { id_binnacle: id },
			transaction: t,
		})
		await binnacle.destroy({ transaction: t })

		await t.commit()
		return { id: Number(id) }
	} catch (e) {
		await t.rollback()
		console.error('Error al eliminar la bitácora:', e)
		throw e
	}
}

module.exports = {
	getAllBinnacles,
	saveBinnacle,
	updateBinnacle,
	deleteBinnacle,
}
