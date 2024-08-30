const {
	getAllRecloser,
	getRecloserId,
	dataRecloseInflux,
	upMigrationRecloser,
	getAllRecloserDesarrollo,
	getMetrologiaIntantanea,
	getListEvents,
	getTensionABC,
	getCorriente,
	getInterruption,
} = require('../services/RecloserServices')
const { getListVariables } = require('../services/VariablesServices')

const migrationRecloser = async (req, res) => {
	try {
		const reclosers = await getAllRecloserDesarrollo()
		const listRecloser = reclosers.map((item) => {
			return {
				id: item.id,
				name: item.name,
				serial: item.serial,
				lat_location: item.lat_location,
				lng_location: item.lng_location,
				status: item.status,
				status_recloser: item.status_recloser,
				status_alarm_recloser: item.status_alarm_recloser,
				num_recloser: item.num_recloser,
				id_version: item.type_recloser == 1 ? 3 : 1,
			}
		})
		const saveRecloser = await upMigrationRecloser(listRecloser)
		res.status(200).json(saveRecloser)
	} catch (error) {
		res.status(400).json(error.message)
	}
}

const listAllRecloser = async (req, res) => {
	try {
		const reclosers = await getAllRecloser()
		res.status(200).json(reclosers)
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
			...recloser.dataValues,
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
		const dataRecloser = {
			...recloser.dataValues,
			version: recloser.version.name,
			brand: recloser.version.brand.name,
		}
		const dataInflux = await dataRecloseInflux({ serial: dataRecloser.serial, brand: dataRecloser.brand })
		const dataReturn = {
			recloser: dataRecloser,
			instantaneo: dataInflux,
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
		const dataInflux = await getMetrologiaIntantanea({ serial: recloser.serial, brand: recloser.version.brand.name })
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
		const dataInflux = await getListEvents({ serial: recloser.serial, brand: recloser.version.brand.name })
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
		const dataInflux = await getTensionABC({ serial: recloser.serial, brand: recloser.version.brand.name })
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
		const dataInflux = await getCorriente({ serial: recloser.serial, brand: recloser.version.brand.name })
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
		const dataInflux = await getInterruption({ serial: recloser.serial, brand: recloser.version.brand.name })
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
	interruptions,
	corrientesGraf,
	tensionABCGraf,
	listEvents,
	migrationRecloser,
	listAllRecloser,
	getRecloserxID,
	getDataInfluxRecloser,
	metrologiaIntantanea,
}
