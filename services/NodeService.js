const { db } = require('../models')

/**
 * Busca un nodo por su ID en la base de datos, junto con su historial asociado.
 *
 * @param {number} id - El ID del nodo que se desea buscar.
 * @param {boolean} [required=false] - Indica si la inclusión del historial es obligatoria.
 * @returns {Promise<Object|null>} Un objeto que representa el nodo encontrado o null si no se encuentra.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const searchNode = async (id, required = false) => {
	try {
		const Nodes = await db.Node.findOne({
			where: { id: id },
			include: [
				{
					association: 'node_history',
					required: required,
					where: { status: 1 },
				},
				{
					association: 'maps',
				},
			],
		})
		return Nodes
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene todos los nodos activos de la base de datos.
 *
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan todos los nodos activos.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const ListNode = async () => {
	try {
		const Nodes = await db.Node.findAll({
			where: { status: 1 },
			include: [
				{
					association: 'node_history',
					required: false,
					where: { status: 1 },
				},
			],
		})
		return Nodes
	} catch (error) {
		throw error
	}
}

/**
 * Obtiene el historial de un nodo específico.
 *
 * @param {number} id - El ID del nodo cuyo historial se desea consultar.
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan el historial del nodo.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const ListNode_history = async (id) => {
	try {
		const Nodes = await db.Node_History.findAll({
			where: [{ id_node: id }, { status: 1 }],
		})
		return Nodes
	} catch (error) {
		throw error
	}
}

/**
 * Busca una relación activa entre un nodo y un dispositivo en la base de datos.
 *
 * @param {number} id - El ID del dispositivo.
 * @param {string} type - El tipo de dispositivo.
 * @returns {Promise<Object|null>} Un objeto que representa la relación activa encontrada o null si no se encuentra.
 * @throws {Error} Lanza un error si ocurre algún problema durante la consulta.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const searchRelationActive = async (id, type) => {
	try {
		const Nodes = await db.Node_History.findOne({
			where: [{ id_device: id }, { type_device: type }, { status: 1 }],
			include: {
				association: 'nodes',
			},
		})
		return Nodes
	} catch (error) {
		throw error
	}
}

/**
 * Guarda o actualiza un nodo en la base de datos.
 * Si el nodo con el número especificado ya existe, se actualiza con los nuevos datos.
 * Si no existe, se crea un nuevo registro en la base de datos.
 *
 * @param {Object} dataNode - Un objeto que contiene los datos del nodo, incluyendo nombre, número, descripción, latitud, longitud y estado.
 * @param {Object} transaction - La transacción de Sequelize para asegurar la atomicidad de la operación.
 * @returns {Promise<Object>} El nodo guardado o actualizado.
 * @throws {Error} Lanza un error si ocurre algún problema durante la transacción.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const addNode = async (dataNode, id_user, transaction) => {
	try {
		const data = {
			name: dataNode.name,
			number: dataNode.number,
			description: dataNode.description,
			lat_location: dataNode.lat_location,
			lng_location: dataNode.lng_location,
			id_map: dataNode.id_map,
			status: dataNode.status,
			type: dataNode.type,
			id_user_create: id_user,
		}

		const [Node, created] = await db.Node.findOrCreate({
			where: [{ number: data.number }],
			defaults: { ...data },
			transaction,
		})
		if (!created) {
			delete data.id_user_create
			data.id_user_edit = id_user
			await Node.update(data, { transaction })
		}
		return Node
	} catch (error) {
		throw error
	}
}

/**
 * Guarda o actualiza una relación entre un nodo y un dispositivo en la base de datos.
 * Si la relación ya existe, se actualiza con los nuevos datos.
 * Si no existe, se crea un nuevo registro en la base de datos.
 *
 * @param {Object} dataRelation - Un objeto que contiene los datos de la relación entre nodo y dispositivo.
 * @param {Object} transaction - La transacción de Sequelize para asegurar la atomicidad de la operación.
 * @returns {Promise<Object>} La relación guardada o actualizada.
 * @throws {Error} Lanza un error si ocurre algún problema durante la transacción.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const saveRelation = async (dataRelation, transaction) => {
	try {
		const [Node_History, created] = await db.Node_History.findOrCreate({
			where: [
				{ id_node: dataRelation.id_node },
				{ id_device: dataRelation.id_device },
				{ type_device: dataRelation.type_device },
				{ status: 1 },
			],
			defaults: { ...dataRelation },
			transaction: transaction,
		})
		if (!created) {
			await Node_History.update(dataRelation, { transaction: transaction })
		}
		return Node_History
	} catch (error) {
		throw error
	}
}

/**
 * Valida si un número de nodo está disponible para su uso.
 *
 * @param {string} number - El número del nodo a validar.
 * @param {number} idNode - El ID del nodo actual para evitar conflictos de actualización.
 * @returns {Promise<string|boolean>} Devuelve un mensaje si el número no está disponible o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const validateNode = async (number, idNode) => {
	try {
		const Node = await db.Node.findOne({
			where: {
				number: number,
			},
		})
		if (Node === null) {
			return false
		} else {
			if (Node.id != idNode) {
				return 'La matricula no esta disponible'
			} else {
				return false
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Valida si un dispositivo ya está relacionado con un nodo en la base de datos.
 *
 * @param {Object} data - Un objeto que contiene los datos del dispositivo a validar (id_device y type_device).
 * @returns {Promise<string|boolean>} Devuelve un mensaje si el dispositivo ya está relacionado o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const validateRelation = async (data) => {
	try {
		const Node_History = await db.Node_History.findOne({
			where: [{ id_device: data.id_device }, { type_device: data.type_device }, { status: 1 }],
		})
		if (Node_History === null) {
			return false
		} else {
			if (Node_History.id_node == data.id_node) {
				return false
			} else {
				return 'Este Dispositivo ya esta relacionado'
			}
		}
	} catch (error) {
		throw error
	}
}

/**
 * Desvincula un nodo de la base de datos actualizando su estado a inactivo.
 *
 * @param {number} id - El ID del nodo que se desea desvincular.
 * @returns {Promise<Object>} Devuelve el resultado de la actualización del nodo.
 * @throws {Error} Lanza un error si ocurre algún problema durante la operación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 *
 */
const unLinkNode = async (data, id_user, transaction) => {
	try {
		const Node_History = await db.Node_History.update(
			{ status: 0, id_user_edit: id_user },
			{ where: { id_node: data.id }, transaction: transaction }
		)
		return Node_History
	} catch (error) {
		throw error
	}
}

/**
 * Desvincula un nodo de la base de datos actualizando su estado a inactivo.
 *
 * @param {number} id - El ID del nodo que se desea desvincular.
 * @returns {Promise<Object>} Devuelve el resultado de la actualización del nodo.
 * @throws {Error} Lanza un error si ocurre algún problema durante la operación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 *
 */
const removeNode = async (id, id_user, transaction) => {
	try {
		const Node = await db.Node.update(
			{ status: 0, id_user_edit: id_user },
			{ where: { id: id }, transaction: transaction }
		)
		return Node
	} catch (error) {
		throw error
	}
}

module.exports = {
	searchNode,
	ListNode,
	ListNode_history,
	searchRelationActive,
	addNode,
	saveRelation,
	validateNode,
	validateRelation,
	unLinkNode,
	removeNode,
}
