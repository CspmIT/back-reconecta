const getElements = async (db, filter = null) => {
	try {
		const query = {
			include: [
				{
					model: db.MapLocation,
					as: 'maps',
				},
				{
					model: db.Equipment,
					as: 'equipments',
					include: [
						{
							model: db.EquipmentModel,
							as: 'equipmentmodels',
							required: false,
						},
					],
				},
				{
					model: db.SubstationRuralClient,
					as: 'clients',
				},
			],
		}
		if (filter?.id) {
			query.where = { id: filter.id }
		}
		if (filter?.type) {
			query.where = { type: filter.type }
		}
		return await db.Element.findAll(query)
	} catch (e) {
		throw e
	}
}

const getEquipment = async (db, filter = null) => {
	try {
		const query = {
			include: [
				{
					model: db.Element,
					as: 'elements',
				},
				{
					model: db.EquipmentModel,
					as: 'equipmentmodels',
					where: {},
				},
			],
		}
		if (filter?.id) {
			query.where = { id: filter.id }
		}
		if (filter?.element) {
			query.where = { id_element: filter.element }
		}
		if (filter?.model) {
			query.where = { id_model: filter.model }
		}
		if (filter?.serial) {
			query.where = { serial: filter.serial }
		}
		if (filter?.type) {
			const equipmentModelsInclude = query.include.find((model) => model.as === 'equipmentmodels')
			equipmentModelsInclude.where.type = filter.type
		}
		return await db.Equipment.findAll(query)
	} catch (e) {
		throw e
	}
}

const getModels = async (db) => {
	try {
		return await db.EquipmentModel.findAll()
	} catch (e) {
		throw e
	}
}

const saveElement = async (db, element, equipment = [], client = []) => {
	const transaction = await db.sequelize.transaction()
	try {
		const data = await db.Element.create(element, { transaction })
		if (data.id) {
			if (equipment.length > 0 && data.type !== 3) {
				equipment.map((equip) => {
					equip.id_element = data.id
					equip.id_user = data.id_user
					equip.observation = equip.observation || null
					delete equip.id
				})
				await db.Equipment.bulkCreate(equipment, { transaction })
			}
			if (data.type === 3 && client.length > 0) {
				client.map((cli) => {
					cli.id_element = data.id
					cli.meter = cli.meter || null
					cli.status = 1
					delete cli.id
				})
				await db.SubstationRuralClient.bulkCreate(client, { transaction })
			}
		}
		await transaction.commit()
		return data
	} catch (e) {
		await transaction.rollback()
		console.error(e)
		throw e
	}
}

const saveEquipment = async (db, data) => {
	try {
		if (data.id) {
			const equipment = await db.Equipment.findByPk(data.id)
			if (equipment) {
				await equipment.update(data)
				return await equipment
			}
		}
		return await db.Equipment.create(data)
	} catch (e) {
		console.log(e)
		throw e
	}
}

const updateElement = async (db, element, equipment = [], client = []) => {
	const transaction = await db.sequelize.transaction()
	try {
		const data = await db.Element.findByPk(element.id)
		if (!data) throw new Error('Elemento no encontrado')
		await data.update(element, { transaction })
		if (equipment.length > 0) {
			const operations = equipment.map((equip) => {
				const cleanEquip = {
					...equip,
					id_element: data.id,
					id_user: data.id_user,
					observation: equip.observation || null,
				}
				delete cleanEquip.id

				if (cleanEquip.bd_id) {
					const bdId = cleanEquip.bd_id
					delete cleanEquip.bd_id
					return db.Equipment.update(cleanEquip, {
						where: { id: bdId },
						transaction,
					})
				} else {
					delete cleanEquip.bd_id
					return db.Equipment.create(cleanEquip, { transaction })
				}
			})

			await Promise.all(operations)
		}
		if (data.type === 3 && client.length > 0) {
			const operations = client.map((cli) => {
				const cleanClient = {
					...cli,
					id_element: data.id,
					meter: cli.meter || null,
					status: 1,
				}
				delete cleanClient.id

				if (cleanClient.bd_id) {
					const bdId = cleanClient.bd_id
					delete cleanClient.bd_id
					return db.SubstationRuralClient.update(cleanClient, {
						where: { id: bdId },
						transaction,
					})
				} else {
					delete cleanClient.bd_id
					return db.SubstationRuralClient.create(cleanClient, { transaction })
				}
			})
			await Promise.all(operations)
		}
		await transaction.commit()
		return data
	} catch (e) {
		await transaction.rollback()
		throw e
	}
}

const updateSubstationClient = async (db, data) => {
	try {
		return db.SubstationRuralClient.update(data, { where: { id: data.id } })
	} catch (e) {
		throw e
	}
}

const historySubstationPat = async (db, data) => {
	try {
		const query = {
			where: {
				id_element: data.id,
			},
		}
		if (data.status) {
			query.where.status = data.status
		}
		if (data.dateStart || data.dateCurrent) {
			query.where.createdAt = {}
			if (data.dateStart) {
				query.where.createdAt[Op.gte] = new Date(data.dateStart)
			}
			if (data.dateCurrent) {
				query.where.createdAt[Op.lte] = new Date(data.dateCurrent)
			}
		}
		return db.SubstationRuralPat.findAll(query)
	} catch (e) {
		throw e
	}
}
const saveSubstationPat = async (db, data) => {
	const transaction = await db.sequelize.transaction()
	try {
		const newStatus = { status: false }
		await db.SubstationRuralPat.update(newStatus, { where: { id_element: data.id_element }, transaction })
		const dataCreated = await db.SubstationRuralPat.create(data, { transaction })
		await transaction.commit()
		return dataCreated
	} catch (e) {
		await transaction.rollback()
		throw e
	}
}

const saveImage = async (db, data) => {
	try {
		await db.Element.update(data, { where: { id: data.id } })
	} catch (e) {
		throw e
	}
}

module.exports = {
	getElements,
	getEquipment,
	getModels,
	saveElement,
	saveEquipment,
	updateElement,
	updateSubstationClient,
	historySubstationPat,
	saveSubstationPat,
	saveImage,
}
