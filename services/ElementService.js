const { Op } = require('sequelize')
const getElements = async (db, filter = null) => {
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
}

const getEquipment = async (db, filter = null) => {
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
}

const getModels = async (db) => {
	return await db.EquipmentModel.findAll()
}

const saveElement = async (db, element, equipment = [], client = []) => {
	const transaction = await db.sequelize.transaction()
	try {
		const data = await db.Element.create(element, { transaction })
		if (data.id) {
			if (equipment.length > 0 && data.type !== 3) {
				// Un solo principal, y el resto NULL y no false: dos ceros en el
				// mismo elemento chocarian contra el indice unico
				const primerPrincipal = equipment.findIndex((equip) => equip.is_main)
				equipment.map((equip, i) => {
					equip.id_element = data.id
					equip.id_user = data.id_user
					equip.observation = equip.observation || null
					equip.is_main = i === primerPrincipal ? true : null
					delete equip.id
				})
				await db.Equipment.bulkCreate(equipment, { transaction })
			}
			if (data.type === 3 && client.length > 0) {
				client.map((cli) => {
					cli.id_element = data.id
					cli.meter = cli.meter || null
					cli.account = cli.account || null
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

/**
 * Deja un solo equipo principal en el elemento. Hay que limpiar ANTES de marcar
 * y no despues: el indice unico (id_element, is_main) rechaza dos principales,
 * asi que marcar primero fallaria.
 *
 * @param {number|null} idEquipment equipo a marcar; null solo limpia
 */
const setMainEquipment = async (db, idElement, idEquipment, transaction) => {
	await db.Equipment.update({ is_main: null }, { where: { id_element: idElement }, transaction })
	if (!idEquipment) return
	const [filas] = await db.Equipment.update(
		{ is_main: true },
		{ where: { id: idEquipment, id_element: idElement }, transaction }
	)
	if (!filas) throw new Error('El equipo principal no pertenece al elemento')
}

const saveEquipment = async (db, data) => {
	// El principal se decide en updateElement, que puede limpiar el anterior en
	// la misma transaccion. Por aca pasaria un segundo principal y lo rechazaria
	// el indice unico con un error de base sin sentido para el usuario.
	delete data.is_main
	if (data.id) {
		const equipment = await db.Equipment.findByPk(data.id)
		if (equipment) {
			await equipment.update(data)
			return await equipment
		}
	}
	return await db.Equipment.create(data)
}

const updateElement = async (db, element, equipment = [], client = []) => {
	const transaction = await db.sequelize.transaction()
	try {
		const data = await db.Element.findByPk(element.id)
		if (!data) throw new Error('Elemento no encontrado')
		await data.update(element, { transaction })
		if (equipment.length > 0) {
			/*
			 * El principal se aplica aparte, despues de guardar los equipos: un
			 * equipo nuevo todavia no tiene id, y si se dejara viajar `is_main` en
			 * los updates dos filas podrian quedar en 1 a la vez y el indice unico
			 * tiraria un error de base incomprensible.
			 */
			const marcado = equipment.find((equip) => equip.is_main)
			const operations = equipment.map((equip) => {
				const cleanEquip = {
					...equip,
					id_element: data.id,
					id_user: data.id_user,
					observation: equip.observation || null,
				}
				delete cleanEquip.id
				delete cleanEquip.is_main

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

			// Se resuelve por serial y no por id: si el principal es un equipo
			// recien creado en este mismo guardado, el id lo genero la base ahora.
			let idPrincipal = marcado?.bd_id || null
			if (marcado && !idPrincipal) {
				const creado = await db.Equipment.findOne({
					where: { id_element: data.id, serial: marcado.serial },
					transaction,
				})
				idPrincipal = creado?.id || null
			}
			await setMainEquipment(db, data.id, idPrincipal, transaction)
		}
		if (data.type === 3 && client.length > 0) {
			const operations = client.map((cli) => {
				const cleanClient = {
					...cli,
					id_element: data.id,
					meter: cli.meter || null,
					account: cli.account || null,
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
	return db.SubstationRuralClient.update(data, { where: { id: data.id } })
}

const saveSubstationClient = async (db, data) => {
	return db.SubstationRuralClient.create({
		name: data.name,
		meter: data.meter || null,
		account: data.account || null,
		id_element: data.id_element,
		status: 1,
	})
}

const removeSubstationClient = async (db, id) => {
	return db.SubstationRuralClient.destroy({ where: { id } })
}

const historySubstationPat = async (db, data) => {
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
	await db.Element.update(data, { where: { id: data.id } })
}

module.exports = {
	getElements,
	getEquipment,
	getModels,
	saveElement,
	saveEquipment,
	updateElement,
	updateSubstationClient,
	saveSubstationClient,
	removeSubstationClient,
	historySubstationPat,
	saveSubstationPat,
	saveImage,
}
