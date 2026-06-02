const { getDataAnalyzer } = require('../services/AnalyzerService')
const {
	getElements,
	getEquipment,
	getModels,
	saveElement,
	saveEquipment,
	updateElement,
	saveSubstationPat,
	historySubstationPat,
	updateSubstationClient,
	saveSubstationClient,
	removeSubstationClient,
	saveImage,
} = require('../services/ElementService')
const { EventsCustom, getEventsInflux } = require('../services/EventService')
const { getStatus } = require('../services/MeterService')
const { dataRecloseInflux } = require('../services/RecloserServices')

const listElements = async (req, res) => {
	try {
		const filters = req.params
		const elements = await getElements(req.db, filters)
		const activeEvents = await EventsCustom(req.db, { flash_screen: 1 })
		const influxName = req.user.influx_name

		const elementsWithInflux = await Promise.all(
			elements.map(async (element) => {
				const jsonElement = element.toJSON ? element.toJSON() : element

				jsonElement.equipments = await Promise.all(
					jsonElement.equipments.map(async (equipment) => {
						let dc
						const jsonEquipment = equipment.toJSON ? equipment.toJSON() : equipment

						const data = {
							serial: jsonEquipment.serial,
							brand: jsonEquipment.equipmentmodels.name,
							version: jsonEquipment.equipmentmodels.name,
						}

						switch (jsonEquipment.equipmentmodels.type) {
							case 1: {
								jsonEquipment.influxData = await dataRecloseInflux(data, influxName)

								const flashAlarm = await getEventsInflux(req.db, influxName, activeEvents, {
									id: jsonEquipment.id,
								})

								jsonEquipment.flashAlarm =
									flashAlarm.length > 0 && flashAlarm[0].some((a) => a.statusAlert === 1)

								break
							}

							case 2: {
								dc = await getStatus(data, influxName)
								jsonEquipment.influxData = { 'd/c': dc === 2 }
								break
							}

							case 3: {
								const dataAnalyzer = {
									serial: jsonEquipment.serial,
									brand: jsonEquipment.equipmentmodels.name.toLowerCase(),
									version: jsonEquipment.equipmentmodels.brand.toLowerCase(),
								}

								dc = await getDataAnalyzer(dataAnalyzer, influxName)
								jsonEquipment.influxData = {
									'd/c': dc instanceof Map && dc.size > 0,
								}
								break
							}

							default: {
								jsonEquipment.influxData = { 'd/c': true }
								break
							}
						}

						return jsonEquipment
					})
				)

				return jsonElement
			})
		)

		return res.status(200).json(elementsWithInflux)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const listEquipments = async (req, res) => {
	try {
		const filters = req.params
		const equipments = await getEquipment(req.db, filters)

		return res.status(200).json(equipments)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const listModels = async (req, res) => {
	try {
		const models = await getModels(req.db)
		return res.status(200).json(models)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addElement = async (req, res) => {
	try {
		const { element, equipment, client } = req.body
		element.id_user = req.user.id
		const data = await saveElement(req.db, element, equipment, client)
		return res.status(200).json({ message: 'Elemento creado correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const editElement = async (req, res) => {
	try {
		const { element, equipment, client } = req.body
		element.id_user = req.user.id
		const data = await updateElement(req.db, element, equipment, client)
		return res.status(200).json({ message: 'Elemento modificado correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addEquipment = async (req, res) => {
	try {
		const equipment = req.body
		equipment.id_user = req.user.id
		const data = await saveEquipment(req.db, equipment)
		return res.status(200).json({ message: 'Equipo creado correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const editSubstationClient = async (req, res) => {
	try {
		const body = req.body
		const data = await updateSubstationClient(req.db, body)
		return res.status(200).json({ message: 'Equipo creado correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addSubstationClient = async (req, res) => {
	try {
		if (!req.body.name || !req.body.id_element) {
			return res.status(500).json({ message: 'Faltan datos' })
		}
		const data = await saveSubstationClient(req.db, req.body)
		return res.status(200).json({ message: 'Cliente agregado correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const deleteSubstationClient = async (req, res) => {
	try {
		const { id } = req.body
		if (!id) {
			return res.status(500).json({ message: 'Faltan datos' })
		}
		await removeSubstationClient(req.db, id)
		return res.status(200).json({ message: 'Cliente eliminado correctamente' })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const listSubstationPat = async (req, res) => {
	try {
		const data = await historySubstationPat(req.db, req.body)
		return res.status(200).json(data)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addSubstationPat = async (req, res) => {
	try {
		const body = {
			value: req.body.value,
			id_element: req.body.element,
			status: true,
			id_user: req.user.id,
		}
		const data = await saveSubstationPat(req.db, body)
		return res.status(200).json({ message: 'Medicion PAT cargada correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addImageElement = async (req, res) => {
	try {
		if (!req.body.image || !req.body.id) {
			return res.status(500).json({ message: 'Faltan datos' })
		}
		await saveImage(req.db, req.body)
		return res.status(200).json({ message: 'Imagen guardada correctamente' })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	listElements,
	listEquipments,
	listModels,
	addElement,
	editElement,
	addEquipment,
	editSubstationClient,
	addSubstationClient,
	deleteSubstationClient,
	listSubstationPat,
	addSubstationPat,
	addImageElement,
}
