const { getDataAnalyzer } = require('../services/AnalyzerService')
const {
	getElements,
	getEquipment,
	getModels,
	saveElement,
	saveEquipment,
	updateElement,
} = require('../services/ElementService')
const { EventsCustom, getEventsInflux } = require('../services/EventService')
const { getStatus } = require('../services/MeterService')
const { dataRecloseInflux } = require('../services/RecloserServices')

const listElements = async (req, res) => {
	try {
		const filters = req.params
		const elements = await getElements(filters)
		const activeEvents = await EventsCustom({ flash_screen: 1 })
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
							case 1:
								jsonEquipment.influxData = await dataRecloseInflux(data, influxName)
								const flashAlarm = await getEventsInflux(influxName, activeEvents, {
									id: jsonEquipment.id,
								})
								jsonEquipment.flashAlarm = flashAlarm.length !== 0 && flashAlarm[0].length !== 0
								break
							case 2:
								dc = await getStatus(data, influxName)
								jsonEquipment.influxData = { 'd/c': dc === 2 }
								break
							case 3:
								const dataAnalyzer = {
									serial: jsonEquipment.serial,
									brand: jsonEquipment.equipmentmodels.name.toLowerCase(),
									version: jsonEquipment.equipmentmodels.brand.toLowerCase(),
								}
								dc = await getDataAnalyzer(dataAnalyzer, influxName)
								jsonEquipment.influxData = { 'd/c': dc instanceof Map && dc.size > 0 }
								break
							default:
								jsonEquipment.influxData = { 'd/c': true }
								break
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
		const equipments = await getEquipment(filters)

		return res.status(200).json(equipments)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const listModels = async (req, res) => {
	try {
		const models = await getModels()
		return res.status(200).json(models)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addElement = async (req, res) => {
	try {
		const { element, equipment, client } = req.body
		element.id_user = req.user.id
		const data = await saveElement(element, equipment, client)
		return res.status(200).json({ message: 'Elemento creado correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const editElement = async (req, res) => {
	try {
		const { element, equipment, client } = req.body
		element.id_user = req.user.id
		const data = await updateElement(element, equipment, client)
		return res.status(200).json({ message: 'Elemento modificado correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addEquipment = async (req, res) => {
	try {
		const equipment = req.body
		equipment.id_user = req.user.id
		const data = await saveEquipment(equipment)
		return res.status(200).json({ message: 'Equipo creado correctamente', data })
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
}
