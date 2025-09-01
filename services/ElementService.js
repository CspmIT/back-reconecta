const { db } = require('../models')

const getElements = async (filter = null) => {
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

const getEquipment = async (filter = null) => {
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

const getModels = async () => {
	try {
		return await db.EquipmentModel.findAll()
	} catch (e) {
		throw e
	}
}

const saveElement = async (element, equipment = [], client = []) => {
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
					cli.pat = cli.pat || null
					cli.power = cli.power || null
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

const saveEquipment = async (data) => {
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

const updateElement = async (element, equipment = [], client = []) => {
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
					pat: cli.pat || null,
					power: cli.power || null,
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

module.exports = {
	getElements,
	getEquipment,
	getModels,
	saveElement,
	saveEquipment,
	updateElement,
}
