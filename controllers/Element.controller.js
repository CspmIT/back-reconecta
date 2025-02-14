const { getElements, getEquipment, getModels, saveElement, saveEquipment } = require('../services/ElementService')

const listElements = async (req, res) => {
	try {
		const elements = await getElements()
		return res.status(200).json(elements)
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
		const { element, equipment } = req.body
		element.id_user = req.user.id
		const data = await saveElement(element, equipment)
		return res.status(200).json({ message: 'Elemento creado correctamente', data })
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
	addEquipment,
}
