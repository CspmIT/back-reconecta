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
				},
			],
		}
		if (filter?.id) {
			query.where = { id: filter.id }
		}
		if (filter?.element) {
			query.where = { id_element: filter.element }
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

const saveElement = async (element, equipment = []) => {
	const transaction = await db.sequelize.transaction()
	try {
		const data = await db.Element.create(element, { transaction })
		if (data.id && equipment.length > 0) {
			console.log(data)
			equipment.map((equip) => {
				equip.id_element = data.id
				equip.id_user = data.id_user
				equip.observation = equip.observation || null
				delete equip.id
			})
			console.log(equipment)
			await db.Equipment.bulkCreate(equipment, { transaction })
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
		return await db.Equipment.bulkCreate(data)
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
}
