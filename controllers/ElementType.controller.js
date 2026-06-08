const {
	getElementTypes,
	saveElementType,
	updateElementType,
	removeElementType,
} = require('../services/ElementTypeService')

const listElementTypes = async (req, res) => {
	try {
		const data = await getElementTypes(req.db)
		return res.status(200).json(data)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const addElementType = async (req, res) => {
	try {
		if (!req.body.name) {
			return res.status(500).json({ message: 'Faltan datos' })
		}
		const data = await saveElementType(req.db, req.body)
		return res.status(200).json({ message: 'Tipo creado correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const editElementType = async (req, res) => {
	try {
		if (!req.body.id || !req.body.name) {
			return res.status(500).json({ message: 'Faltan datos' })
		}
		const data = await updateElementType(req.db, req.body)
		return res.status(200).json({ message: 'Tipo modificado correctamente', data })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const deleteElementType = async (req, res) => {
	try {
		const { id } = req.body
		if (!id) {
			return res.status(500).json({ message: 'Faltan datos' })
		}
		await removeElementType(req.db, id)
		return res.status(200).json({ message: 'Tipo eliminado correctamente' })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	listElementTypes,
	addElementType,
	editElementType,
	deleteElementType,
}
