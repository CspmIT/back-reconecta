const getAllBinnacles = async (db, filter = null) => {
	try {
		const query = {
			include: [
				{ model: db.Element, as: 'element' },
				{ model: db.Equipment, as: 'equipment' },
				{ model: db.Binnacle_pictures, as: 'pictures' },
				{
					model: db.Personal,
					as: 'personal',
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
		const { personal = [], pictures = [], ...binnacleData } = data

		const binnacle = await db.Binnacle.create(binnacleData, { transaction: t })

		if (personal.length) {
			const personalRows = personal.map((id_personal) => ({
				id_binnacle: binnacle.id,
				id_personal,
			}))
			await db.Binnacle_personal.bulkCreate(personalRows, { transaction: t })
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

		const { personal, pictures, ...binnacleData } = data
		await binnacle.update(binnacleData, { transaction: t })

		if (Array.isArray(personal)) {
			await db.Binnacle_personal.destroy({
				where: { id_binnacle: id },
				transaction: t,
			})
			if (personal.length) {
				const personalRows = personal.map((id_personal) => ({
					id_binnacle: id,
					id_personal,
				}))
				await db.Binnacle_personal.bulkCreate(personalRows, { transaction: t })
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

		await db.Binnacle_personal.destroy({
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

// Catálogo unificado para el selector "Equipo vinculado" de Binnacle.
// Devuelve los Equipments + los Elements tipo subestación rural (Element.type === 3),
// que viven sólo como Element y no tienen un Equipment asociado.
const getBinnacleEquipos = async (db) => {
	const equipments = await db.Equipment.findAll({
		include: [
			{ model: db.Element, as: 'elements' },
			{ model: db.EquipmentModel, as: 'equipmentmodels' },
		],
	})
	const subestaciones = await db.Element.findAll({
		where: { type: 3 },
	})

	const equipmentItems = equipments.map((eq) => {
		const json = eq.toJSON ? eq.toJSON() : eq
		const elemento = json.elements
		const modelo = json.equipmentmodels
		const nombre = [elemento?.name, json.observation].filter(Boolean).join(' - ')
		return {
			kind: 'equipment',
			id: json.id,
			id_element: json.id_element ?? null,
			nombre: nombre || `Equipo ${json.id}`,
			type: modelo?.type ?? null,
			ubicacion: elemento?.description || json.serial || '',
			serial: json.serial ?? null,
		}
	})

	const elementItems = subestaciones.map((el) => {
		const json = el.toJSON ? el.toJSON() : el
		return {
			kind: 'element',
			id: json.id,
			id_element: json.id,
			nombre: json.name || `Subestación ${json.id}`,
			// 0 = subestación rural en EQUIPMENT_TYPE_LABEL del frontend.
			type: 0,
			ubicacion: json.description || '',
			serial: null,
		}
	})

	return [...equipmentItems, ...elementItems]
}

module.exports = {
	getAllBinnacles,
	saveBinnacle,
	updateBinnacle,
	deleteBinnacle,
	getBinnacleEquipos,
}
