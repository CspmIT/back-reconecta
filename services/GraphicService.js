const getListGraphics = async (db) => {
	const query = {
		include: [
			{
				model: db.GraphicsVariables,
				as: 'variables',
				include: [
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
			},
		],
		order: [[{ model: db.GraphicsVariables, as: 'variables' }, 'id', 'ASC']],
	}
	return await db.Graphic.findAll(query)
}

const saveAllSunBurst = async (db, dataGraphic, data) => {
	const t = await db.sequelize.transaction()
	try {
		const graphic = await db.Graphic.create(dataGraphic, { transaction: t })

		// Paso 2: aplanar el árbol
		const idCounter = { value: 1 }
		const flatData = flattenTreeWithTempIds(data, null, idCounter)

		// Paso 3: insertar nodos sin parent_id pero con graphic_id
		const inserted = await db.GraphicsVariables.bulkCreate(
			flatData.map((item) => ({
				name: item.name,
				color: item.color,
				id_equipment: item.id_equipment,
				id_graphic: graphic.id,
			})),
			{ transaction: t, returning: true }
		)

		// Paso 4: crear mapa de temp_id → id real
		const tempIdToRealId = {}
		inserted.forEach((row, index) => {
			tempIdToRealId[flatData[index].temp_id] = row.id
		})

		// Paso 5: actualizar parent_id
		const updatePromises = inserted.map((row, index) => {
			const parentTempId = flatData[index].parent_temp_id
			const parentId = parentTempId ? tempIdToRealId[parentTempId] : null
			return row.update({ id_parent: parentId }, { transaction: t })
		})

		await Promise.all(updatePromises)

		await t.commit()
		return { message: 'Guardado con éxito' }
	} catch (e) {
		await t.rollback()
		throw e
	}
}

const flattenTreeWithTempIds = (data, parentTempId = null, idCounter = { value: 1 }) => {
	const result = []

	for (const item of data) {
		const currentTempId = idCounter.value++
		result.push({
			temp_id: currentTempId,
			parent_temp_id: parentTempId,
			name: item.name,
			color: item.itemStyle?.color || null,
			id_equipment: item.topic,
		})

		if (item.children && item.children.length > 0) {
			const children = flattenTreeWithTempIds(item.children, currentTempId, idCounter)
			result.push(...children)
		}
	}

	return result
}

module.exports = {
	saveAllSunBurst,
	getListGraphics,
}
