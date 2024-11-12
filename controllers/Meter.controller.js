const { db } = require('../models')
const { validateMeter, MeterAdd } = require('../services/MeterService')
const { getListVersions, getersionxName } = require('../services/VersionService')
const getVersions = async (req, res) => {
	try {
		const versions = await getListVersions()
		if (!versions) {
			return res.status(404).json({ message: 'Versiones no encontrado' })
		}
		res.status(200).json(versions.filter((item) => item.dataValues.type_device == 'Medidor'))
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const addMeter = async (req, res) => {
	let transaction
	try {
		if (!req.body.serial || !req.body.version) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		// Inicia la transacción
		transaction = await db.sequelize.transaction()
		const version = await getersionxName(req.body.version)
		const validationNode = await validateMeter(req.body.serial, version.dataValues.id, req.body.id)
		if (validationNode) throw new Error(validationNode)
		const data = {
			...req.body,
			id_version: version.id,
			[req.body.id > 0 ? 'id_user_edit' : 'id_user_create']: req.user.id,
		}
		// Guardado de Nodo
		const Meter = await MeterAdd(data, transaction)
		if (!Meter) throw new Error('Error al guardar el Medidor.')
		await transaction.commit()
		res.status(200).json(Meter)
	} catch (error) {
		if (transaction) await transaction.rollback()
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

module.exports = {
	getVersions,
	addMeter,
}
