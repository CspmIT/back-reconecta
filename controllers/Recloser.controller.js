const { db } = require('../models')
const { getDateCheck } = require('../services/ChecksAlarmsService')
const { getEventsDevice, getEventsActive, getEventsInflux } = require('../services/EventService')
const { saveRelation, searchRelationActive } = require('../services/NodeService')
const {
	getAllRecloser,
	getRecloserId,
	dataRecloseInflux,
	getMetrologiaIntantanea,
	getListEvents,
	getTensionABC,
	getCorriente,
	getInterruption,
	saveRecloser,
	validateRecloser,
	getReclosersEnabled,
	getInfoMap,
	getStatusRecloser,
	controlChange,
	getStatusAlarm,
	updateRecloser,
	acRecloser,
	getManauver,
} = require('../services/RecloserServices')
const { getTask } = require('../services/TaskInfluxService')
const { getListVariables } = require('../services/VariablesServices')
const { getListVersions } = require('../services/VersionService')

const listAllRecloser = async (req, res) => {
	try {
		const reclosers = await getAllRecloser()
		const result = await Promise.all(
			reclosers.map(async (recloser) => {
				let relation = []
				if (recloser.id_node) {
					const history = await searchRelationActive(recloser.id, 1)
					relation = history?.nodes?.get() || []
				}
				const statusRecloser = await getStatusRecloser(
					{
						brand: recloser.version.brand.name,
						serial: recloser.serial,
					},
					req.user.influx_name
				)
				const finalStatusRecloser =
					statusRecloser !== null && statusRecloser !== undefined ? statusRecloser : recloser.status_recloser
				return {
					id: recloser.id,
					serial: recloser.serial,
					status: recloser.status,
					status_alarm: recloser.status_alarm,
					status_recloser: finalStatusRecloser,
					config: recloser.config,
					id_node: recloser.id_node || null,
					id_relation: relation?.id || null,
					name: relation?.name || null,
					number: relation?.number || null,
					version: `${recloser.version.name} ${recloser.version.brand.name}`,
					id_version: recloser.version.id,
					brand: recloser.version.brand.name,
				}
			})
		)
		res.status(200).json(result)
	} catch (error) {
		if (error.errors) {
			res.status(500).json({ errors: error.errors })
		} else {
			res.status(400).json({ message: error.message })
		}
	}
}

const listReclosersEnabled = async (req, res) => {
	try {
		const reclosers = await getReclosersEnabled()
		const result = reclosers.map((item) => {
			return {
				id: item.id,
				serial: item.serial,
				status: item.status,
				status_recloser: item.status_recloser,
				config: item.config,
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
const getRecloserxID = async (req, res) => {
	try {
		const { id } = req.query
		const recloser = await getRecloserId(id)
		const dataRecloser = {
			...recloser.get(),
			version: recloser.version.name,
			brand: recloser.version.brand.name,
		}
		// recloser.dataValues.brand = await brandRecloser(recloser.type_recloser)
		res.status(200).json(dataRecloser)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const getDataInfluxRecloser = async (req, res) => {
	try {
		const { id } = req.query
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const recloser = await getRecloserId(id)
		if (!recloser) {
			return res.status(404).json({ message: 'Reconectador no encontrado' })
		}
		const relation = await searchRelationActive(recloser.id, 1)
		recloser.setDataValue('relation', relation)
		const dataRecloser = {
			...recloser.get(),
			name: recloser.relation?.[0]?.name || null,
			number: recloser.relation?.[0]?.number || null,
			version: recloser.version.name,
			id_version: recloser.version.id,
			brand: recloser.version.brand.name,
		}
		const influxName = req.user.influx_name
		const dataInflux = await dataRecloseInflux(
			{ serial: dataRecloser.serial, brand: dataRecloser.brand },
			influxName
		)
		const Events = await getEventsDevice(recloser.version.id, 'Reconectador')
		const eventActiveReco = Events.filter((item) => item.priority == 1 && item.flash_screen == 1).map((item) => {
			return { id: item.id_event_influx, name: item.name }
		})
		const event_date = await getDateCheck(recloser.id, 'Reconectador')

		const statusAlarm = await getStatusAlarm(
			{
				brand: recloser?.version?.brand?.name,
				serial: recloser?.serial,
				event: eventActiveReco,
				event_date: event_date?.date_check,
			},
			req.user.influx_name
		)

		const dataReturn = {
			recloser: dataRecloser,
			instantaneo: dataInflux,
			alarm: statusAlarm,
		}
		res.status(200).json(dataReturn)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
const metrologiaIntantanea = async (req, res) => {
	try {
		const { id } = req.query
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const recloser = await getRecloserId(id)
		if (!recloser) {
			return res.status(404).json({ message: 'Reconectador no encontrado' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await getMetrologiaIntantanea(
			{
				serial: recloser.serial,
				brand: recloser.version.brand.name,
			},
			influxName
		)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
const getAcRecloser = async (req, res) => {
	try {
		const { id } = req.query
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const recloser = await getRecloserId(id)
		if (!recloser) {
			return res.status(404).json({ message: 'Reconectador no encontrado' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await acRecloser(
			{
				serial: recloser.serial,
				brand: recloser.version.brand.name,
			},
			influxName
		)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const listEvents = async (req, res) => {
	try {
		const { id } = req.query
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const recloser = await getRecloserId(id)
		if (!recloser) {
			return res.status(404).json({ message: 'Reconectador no encontrado' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await getListEvents(
			{ serial: recloser.serial, brand: recloser.version.brand.name },
			influxName
		)
		const variables = await getListVariables()
		const result = dataInflux.map((item) => {
			item.variable.value = variables.find((variable) => variable.id_variable === item.variable.value).name
			item.event.value = item.event.value ? 'ON' : 'OFF'
			const date = new Date(item.time.value)
			// options para que el formato quede "dd/mm/yyyy  hh:ii:ss,mmm"
			const options = {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false,
				fractionalSecondDigits: 3,
			}
			let formattedDate = date.toLocaleString('es-AR', options)
			formattedDate = formattedDate.replace(',', '')
			item.time.value = formattedDate
			return item
		})
		result.sort((a, b) => {
			return new Date(b.time.time) - new Date(a.time.time)
		})
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const tensionABCGraf = async (req, res) => {
	try {
		const { id } = req.query
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const recloser = await getRecloserId(id)
		if (!recloser) {
			return res.status(404).json({ message: 'Reconectador no encontrado' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await getTensionABC(
			{ serial: recloser.serial, brand: recloser.version.brand.name },
			influxName
		)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const corrientesGraf = async (req, res) => {
	try {
		const { id } = req.query
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const recloser = await getRecloserId(id)
		if (!recloser) {
			return res.status(404).json({ message: 'Reconectador no encontrado' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await getCorriente(
			{ serial: recloser.serial, brand: recloser.version.brand.name },
			influxName
		)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const interruptions = async (req, res) => {
	try {
		const { id } = req.query
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const recloser = await getRecloserId(id)
		if (!recloser) {
			return res.status(404).json({ message: 'Reconectador no encontrado' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await getInterruption(
			{ serial: recloser.serial, brand: recloser.version.brand.name },
			influxName
		)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const manauvers = async (req, res) => {
	try {
		const { id } = req.query
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const recloser = await getRecloserId(id)
		if (!recloser) {
			return res.status(404).json({ message: 'Reconectador no encontrado' })
		}
		const dataInflux = await getManauver(recloser.serial)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const addRecloser = async (req, res) => {
	let transaction
	try {
		// Inicia la transacción
		transaction = await db.sequelize.transaction()
		// Validaciones previas
		if (!req.body.serial || !req.body.status || !req.body.config || !req.body.version) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		if (req.body.id > 0) {
			const validateReclosers = await validateRecloser(req.body.id)
			if (validateReclosers) {
				throw new Error(validateReclosers)
			}
			req.body.id_user_edit = req.user.id
		} else {
			req.body.id_user_create = req.user.id
		}
		const Recloser = await saveRecloser(req.body, transaction)
		if (!Recloser) throw new Error('Error al guardar el recloser.')
		// Si todo está bien, se confirma la transacción
		await transaction.commit()
		res.status(200).json(Recloser)
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
const deleteRecloser = async (req, res) => {
	let transaction
	try {
		transaction = await db.sequelize.transaction()
		if (!req.body.id) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		const relation = {
			id_node: req.body.id_node,
			id_device: req.body.id,
			type_device: req.body.type_device,
			status: 0,
			id_user_edit: req.user.id,
		}
		req.body.id_node = null
		if (req.body.id > 1) {
			req.body.id_user_edit = req.user.id
		} else {
			req.body.id_user_create = req.user.id
		}
		const Recloser = await saveRecloser(req.body, transaction)
		if (!Recloser) throw new Error('Error al guardar el recloser.')
		if (Recloser.id_node) {
			relation.id_node = Recloser.id_node
		}
		if (relation.id_node) {
			const dataRelation = await saveRelation(relation, transaction)
			if (!dataRelation) throw new Error('Error al guardar la relación entre entidad y recloser.')
		}
		await transaction.commit()
		res.status(200).json(Recloser)
	} catch (error) {
		if (transaction) await transaction.rollback()
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
const unlinkRelation = async (req, res) => {
	let transaction
	try {
		transaction = await db.sequelize.transaction()
		if (!req.body.id || !req.body.id_node) {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		const relation = {
			id_node: req.body.id_node,
			id_device: req.body.id,
			type_device: req.body.type_device,
			id_user_edit: req.user.id,
			status: 0,
		}
		const dataRelation = await saveRelation(relation, transaction)
		if (!dataRelation) throw new Error('Error al guardar la relación entre entidad y recloser.')
		const Recloser = await saveRecloser(
			{ id: req.body.id, id_node: null, serial: req.body.serial, id_user_edit: req.user.id },
			transaction
		)
		if (!Recloser) throw new Error('Error al guardar los cambios del reconectador.')
		await transaction.commit()
		res.status(200).json(dataRelation)
	} catch (error) {
		if (transaction) await transaction.rollback()
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
const getVersions = async (req, res) => {
	try {
		const versions = await getListVersions()
		if (!versions) {
			return res.status(404).json({ message: 'Versiones no encontrado' })
		}
		res.status(200).json(versions.filter((item) => item.dataValues.type_device == 'Reconectador'))
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
const getDataMap = async (req, res) => {
	try {
		const dataMap = await getInfoMap()
		if (!dataMap) {
			return res.status(404).json({ message: 'Dato de mapa no encontrado' })
		}
		res.status(200).json(dataMap)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
const recloserAlarm = async (req, res) => {
	try {
		const Events = await getEventsActive()
		const eventsInflux = await getEventsInflux(req.user.influx_name, Events)
		const returnData = eventsInflux
			.reduce((acc, value) => {
				acc.push(...value)
				return acc
			}, [])
			.sort((a, b) => new Date(b.dateAlert) - new Date(a.dateAlert))
			.reduce((acc, value) => {
				if (value.statusAlert == 1 && value.priority == 1) {
					acc[value.id_device] = 1
				}
				return acc
			}, {})
		return res.status(200).json(Object.keys(returnData).length)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
const controlAction = async (req, res) => {
	try {
		const influxName = req.user.influx_name
		const dataInflux = await controlChange({ ...req.body }, influxName)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
const changeStatusAlarm = async (req, res) => {
	try {
		if (!req.body.id || typeof req.body.status_alarm !== 'boolean') {
			return res.status(400).json({ message: 'Se solicita completar todos los campos.' })
		}
		const dataRecloser = await getTask(req.body.id)
		// await changeStatusTaskInflux()
		// const Recloser = await updateRecloser(req.body)

		return res.status(200).json(dataRecloser)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
module.exports = {
	interruptions,
	corrientesGraf,
	tensionABCGraf,
	listEvents,
	listAllRecloser,
	listReclosersEnabled,
	getRecloserxID,
	getDataInfluxRecloser,
	metrologiaIntantanea,
	addRecloser,
	deleteRecloser,
	unlinkRelation,
	getVersions,
	getDataMap,
	controlAction,
	changeStatusAlarm,
	recloserAlarm,
	getAcRecloser,
	manauvers,
}
