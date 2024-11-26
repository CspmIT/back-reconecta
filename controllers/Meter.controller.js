const { db } = require('../models')
const {
	validateEnable,
	save,
	getList,
	getStatus,
	getEnabled,
	getxID,
	getVIinflux,
	getMetrologyPower,
	getMetrologyEnergy,
	getMetrologyBasic,
	getCurva,
	getVoltageCurrent,
	getCosenoFi,
	getInfoGraf,
	getInfoSurge,
	getInfoUnderVoltage,
	getInfoSurgeSummary,
	getInfoUnderVoltageSummary,
	getInfoCourt,
	getInfoCourtSummary,
	getInfoInterruption,
	getInfoInterruptionSummary,
	getInfoHistoryReset,
	getInfoHistorySummary,
	getInfoEnergyTarifa,
	getInfoEnergyTotal,
} = require('../services/MeterService')
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
		const MeterList = await getList()
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
				const statusMeter = await getStatus(
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
		const meters = await getEnabled()
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
		const validationNode = await validateEnable(req.body.serial, version.dataValues.id, req.body.id)
		if (validationNode) throw new Error(validationNode)
		const data = {
			...req.body,
			id_version: version.id,
			[req.body.id > 0 ? 'id_user_edit' : 'id_user_create']: req.user.id,
		}
		// Guardado de Nodo
		const Meter = await save(data, transaction)
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

const dataMetrologyVI = async (req, res) => {
	try {
		const { version, brand, serial } = req.query
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await getVIinflux({ serial: serial, brand: brand, version: version }, influxName)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const dataMetrologyEnergy = async (req, res) => {
	try {
		const { version, brand, serial } = req.query
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await getMetrologyEnergy({ serial: serial, brand: brand, version: version }, influxName)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const dataMetrologyPower = async (req, res) => {
	try {
		const { version, brand, serial } = req.query
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await getMetrologyPower({ serial: serial, brand: brand, version: version }, influxName)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const dataMetrologyBasic = async (req, res) => {
	try {
		const { version, brand, serial } = req.query
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dataInflux = await getMetrologyBasic({ serial: serial, brand: brand, version: version }, influxName)
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const dataMeter = async (req, res) => {
	try {
		const { id } = req.query
		if (!id) {
			return res.status(400).json({ message: 'El ID es requerido' })
		}
		const meter = await getxID(id)
		if (!meter) {
			throw new Error('Medidor no encontrado')
		}
		const dataMeter = {
			...meter.get(),
			name: meter.history?.[0]?.nodes?.name || null,
			number: meter.history?.[0]?.nodes?.number || null,
			version: meter.version.name,
			id_version: meter.version.id,
			brand: meter.version.brand.name,
		}
		const influxName = req.user.influx_name
		const dataInflux = await getVIinflux(
			{ serial: dataMeter.serial, brand: dataMeter.brand, version: dataMeter.version },
			influxName
		)

		const fechaValue = dataInflux.VI.Date.value.split('/')
		const [day, month, yearPart] = fechaValue
		const year = yearPart.substring(0, 4)
		const hourMinuteSecond = yearPart.substring(5)
		const time2 = new Date(`${year}-${month}-${day} ${hourMinuteSecond}`)
		const dif = getTimeDifference(new Date(dataInflux.VI.Date.time), time2)
		console.log(dif)
		dataMeter.Dif_Time = formatTextDifTime(dif)
		dataMeter.Bat_0 = dataInflux?.VI?.Bat_0?.value >= 0 ? dataInflux.VI.Bat_0.value : 'sin datos'
		dataMeter.Date = dataInflux?.VI?.Date?.value || 'sin datos'
		res.status(200).json(dataMeter)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const formatTextDifTime = (dif) => {
	const dias = dif.days > 0 ? `${dif.days} días ` : ''
	const meses = dif.months > 0 ? `${dif.months} ${dif.months === 1 ? 'mes ' : 'meses '}` : ''
	const text = (dataMeter.Dif_Time = `${meses}${dias}${String(dif.hours).padStart(2, '0')}:${String(
		dif.minutes
	).padStart(2, '0')}:${String(dif.seconds).padStart(2, '0')}`)
	return text
}

const getTimeDifference = (startDate, endDate) => {
	const diff = startDate - endDate
	const seconds = Math.floor(diff / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)
	const months = Math.floor(days / 30) // Aproximado a 30 días por mes
	return {
		seconds: seconds % 60,
		minutes: minutes % 60,
		hours: hours % 24,
		days: days % 30,
		months: months,
	}
}

const dataCurva = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getCurva(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
			influxName
		)
		const calculateValues = (fieldKey) => {
			if (!dataInflux[fieldKey]) return []
			return dataInflux[fieldKey].map((item, index) => {
				const value = (
					(parseFloat(item.value) * dataInflux.VT_0[index].value) /
					dataInflux.VT_1[index].value
				).toFixed(0)
				return { ...item, value }
			})
		}
		dataInflux.V_0 = calculateValues('V_0')
		dataInflux.V_1 = calculateValues('V_1')
		dataInflux.V_2 = calculateValues('V_2')
		delete dataInflux.VT_0
		delete dataInflux.VT_1
		return res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}
const dataVoltageCurrent = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getVoltageCurrent(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
			influxName
		)
		const calculateCorriente = (fieldKey) => {
			return dataInflux[fieldKey].map((item, index) => {
				const value = (
					(parseFloat(item.value) * dataInflux.VT_0[index].value) /
					dataInflux.VT_1[index].value
				).toFixed(0)
				return { ...item, value }
			})
		}
		const calculateTension = (fieldKey) => {
			return dataInflux[fieldKey].map((item, index) => {
				const value = (
					(parseFloat(item.value) * dataInflux.CT_0[index].value) /
					dataInflux.CT_1[index].value
				).toFixed(0)
				return { ...item, value }
			})
		}
		dataInflux.V_0 = calculateCorriente('V_0')
		dataInflux.V_1 = calculateCorriente('V_1')
		dataInflux.V_2 = calculateCorriente('V_2')
		dataInflux.I_0 = calculateTension('I_0')
		dataInflux.I_1 = calculateTension('I_1')
		dataInflux.I_2 = calculateTension('I_2')
		delete dataInflux.VT_0
		delete dataInflux.VT_1
		res.status(200).json(dataInflux)
	} catch (error) {
		if (error.errors) {
			return res.status(500).json({ errors: error.errors })
		} else {
			return res.status(400).json({ message: error.message })
		}
	}
}

const dataCosenoFi = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getCosenoFi(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataInfoGraf = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoGraf(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataSurge = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoSurge(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataSurgeSummary = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoSurgeSummary(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataUnderVoltage = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoUnderVoltage(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataUnderVoltageSummary = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoUnderVoltageSummary(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataCourt = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoCourt(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataCourtSummary = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoCourtSummary(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataInterruption = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoInterruption(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataInterruptionSummary = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoInterruptionSummary(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataHistoryReset = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoHistoryReset(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataHistorySummary = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoHistorySummary(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

const dataHistoryEnergyTarifa = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoEnergyTarifa(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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
const dataHistoryEnergyTotal = async (req, res) => {
	try {
		const { version, brand, serial } = req.body
		if ((!version, !brand, !serial)) {
			return res.status(400).json({ message: 'Faltan parametros...' })
		}
		const influxName = req.user.influx_name
		const dateStart = req.body.dateStart ?? null
		const dateFinished = req.body.dateFinished ?? null
		const dataInflux = await getInfoEnergyTotal(
			{ serial: serial, brand: brand, version: version, dateStart, dateFinished },
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

module.exports = {
	getVersions,
	listMeter,
	addMeter,
	metersEnabled,
	dataMeter,
	dataMetrologyPower,
	dataMetrologyBasic,
	dataMetrologyEnergy,
	dataMetrologyVI,
	dataCurva,
	dataVoltageCurrent,
	dataCosenoFi,
	dataInfoGraf,
	dataSurge,
	dataUnderVoltage,
	dataSurgeSummary,
	dataUnderVoltageSummary,
	dataCourt,
	dataCourtSummary,
	dataInterruption,
	dataInterruptionSummary,
	dataHistoryReset,
	dataHistorySummary,
	dataHistoryEnergyTarifa,
	dataHistoryEnergyTotal,
}
