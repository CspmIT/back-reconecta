const { db } = require('../models')
const { getListMaps } = require('../services/MapLocationService')
const { MeterAdd } = require('../services/MeterService')
const {
	ListNode,
	addNode,
	saveRelation,
	ListNode_history,
	validateNode,
	validateRelation,
	searchNode,
	unLinkNode,
	removeNode,
} = require('../services/NodeService')
const { saveRecloser } = require('../services/RecloserServices')

const getListNode = async (req, res) => {
	try {
		const result = await ListNode()
		return res.status(200).json(result)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const getNodexId = async (req, res) => {
	try {
		if (!req.query.id) {
			throw new Error('Se solicita enviar el id.')
		}
		const result = await searchNode(req.query.id)
		return res.status(200).json(result)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

const unlinkRelationNode = async (req, res) => {
	try {
		transaction = await db.sequelize.transaction()
		if (!req.body.id) {
			return res.status(400).json({ message: 'Se solicita enviar el id del nodo.' })
		}
		const saveUnLink = await unLinkNode(req.body.id, req.user.id, transaction)
		if (!saveUnLink) throw new Error('Error al eliminar las relaciones.')
		await transaction.commit()
		res.status(200).json(saveUnLink)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const deleteNode = async (req, res) => {
	try {
		transaction = await db.sequelize.transaction()
		if (!req.body.id) {
			return res.status(400).json({ message: 'Se solicita enviar el id del nodo.' })
		}
		const saveUnLink = await unLinkNode(req.body.id, req.user.id, transaction)
		if (!saveUnLink) throw new Error('Error al eliminar las relaciones.')
		const saveDelete = await removeNode(req.body.id, req.user.id, transaction)
		if (!saveDelete) throw new Error('Error al eliminar el Nodo.')
		await transaction.commit()
		res.status(200).json(saveDelete)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

const saveNode = async (req, res) => {
	let transaction
	try {
		if (!req.body.name || !req.body.number || !req.body.type) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		// Inicia la transacción
		transaction = await db.sequelize.transaction()
		// Valido la matricula del Nodo
		const validationNode = await validateNode(req.body.number, req.body.id)
		if (validationNode) throw new Error(validationNode)

		// Guardado de Nodo
		const Nodo = await addNode(req.body, req.user.id, transaction)
		if (!Nodo) throw new Error('Error al guardar el Nodo.')

		// Cancelar todas las relaciones no utilizadas
		const realtionsHistory = await ListNode_history(Nodo.id)

		// Relacionar dispositivos existentes y cambiar status de los que no están en req.body.devices
		const existingDeviceIds = req.body.devices?.map((device) => device.id) || []

		for (const relation of realtionsHistory) {
			// Si la relación actual no está en los dispositivos pasados en el body, desactivarla (status = 0)
			if (!existingDeviceIds.includes(relation.id_device)) {
				const dataRelation = {
					id_device: relation.id_device,
					id_node: relation.id_node,
					type_device: relation.type_device,
					id_user_edit: req.user.id,
					status: 0,
				}
				await saveRelation(dataRelation, transaction)
			}
		}
		// Se guardan dispositivos relacionados
		if (req.body.devices && req.body.devices.length) {
			for (const device of req.body.devices) {
				// Guardado de Relacion
				const dataValidation = {
					id_node: req.body.id,
					id_device: device.id,
					type_device: device.type_element,
				}
				const validation = await validateRelation(dataValidation, transaction)
				if (validation) throw new Error(validation)
				const dataRelation = {
					id_device: device.id,
					id_node: Nodo.id,
					type_device: device.type_element,
					id_user_create: req.user.id,
					status: 1,
				}
				const Relation = await saveRelation(dataRelation, transaction)
				if (!Relation) throw new Error('Error al guardar el Nodo.')
				switch (device.type_element) {
					case 1:
						await saveRecloser({ ...device, id_node: Nodo.id }, transaction)
						break
					case 2:
						await MeterAdd({ ...device, id_node: Nodo.id }, transaction)
						break
					// FALTA AGREGAR LOS DEMAS DISPOSITIVOS
					default:
						throw new Error('Error al guardar el Dispositivo.')
				}
			}
		}
		await transaction.commit()
		return res.status(200).json(Nodo)
	} catch (error) {
		// Si ocurre algún error, se revierte la transacción
		if (transaction) await transaction.rollback()

		// Manejo de errores
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const getMaps = async (req, res) => {
	try {
		const listMap = await getListMaps()
		if (!listMap) throw new Error('Error al eliminar las relaciones.')
		res.status(200).json(listMap)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

module.exports = {
	getListNode,
	saveNode,
	getNodexId,
	unlinkRelationNode,
	deleteNode,
	getMaps,
}
