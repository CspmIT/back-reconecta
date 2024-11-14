const { db } = require('../models')
const { validateMeter, MeterAdd, getListMeter, getStatusMeter, getMetersEnabled } = require('../services/MeterService')
const { searchRelationActive } = require('../services/NodeService')
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

const listMeter = async (req, res) => {
	try {
		const MeterList = await getListMeter()
		if (!MeterList) {
			return res.status(404).json({ message: 'Versiones no encontrado' })
		}

		const result = await Promise.all(
			MeterList.map(async (meter) => {
				let relation = []
				if (meter.id_node) {
					const history = await searchRelationActive(meter.id, 2)
					relation = history?.nodes?.get() || []
				}
				const statusMeter = await getStatusMeter(
					{
						brand: meter.version.brand.name,
						version: meter.version.name,
						serial: meter.serial,
					},
					req.user.influx_name
				)
				const finalStatusMeter = statusMeter !== null && statusMeter !== undefined ? statusMeter : 2
				return {
					id: meter.id,
					serial: meter.serial,
					status: meter.status,
					status_meter: finalStatusMeter,
					config: meter.config,
					id_node: meter.id_node || null,
					id_relation: relation?.id || null,
					name: relation?.name || null,
					number: relation?.number || null,
					fullVersion: `${meter.version.name} ${meter.version.brand.name}`,
					version: meter.version.name,
					id_version: meter.version.id,
					brand: meter.version.brand.name,
				}
			})
		)
		res.status(200).json(result)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const metersEnabled = async (req, res) => {
	try {
		const meters = await getMetersEnabled()
		const result = meters.map((item) => {
			return {
				id: item.id,
				serial: item.serial,
				status: item.status,
				version: item.version.name,
				brand: item.version.brand.name,
				id_version: item.version.id,
			}
		})
		res.status(200).json(result)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
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
	listMeter,
	addMeter,
	metersEnabled,
}
