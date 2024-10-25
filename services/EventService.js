const { db } = require('../models')

const typeDeviceInflux = {
	Reconectadores: 'Reconectador',
	Analizador: 'Analizador',
	Meter: 'Medidor',
}
/**
 * Busca y habilita la alarma de un dispositivo recloser basado en el evento MQTT recibido.
 *
 * @param {Object} event - El evento MQTT recibido, contiene información del dispositivo y el evento.
 * @returns {Promise<Object|boolean>} Un objeto con información del dispositivo, evento y tipo de dispositivo si la alarma es válida, o false si no.
 * @throws {Error} Si ocurre un error al obtener la información o procesar el evento.
 * @author Jose Romani <jose.romani@hotmail.com>
 */
const searchEnableAlarm = async (event) => {
	try {
		const nroSerie = event.topic.split('/')[4]
		const brand = event.topic.split('/')[3]
		const typeDevice = typeDeviceInflux[event.topic.split('/')[2]]
		// FALTA AGREGAR EL STATUS :1
		const Recloser = await getDevicexSerieBrand(nroSerie, brand)
		if (!Recloser[0]) {
			return false
		}
		// OBTENGO EL EVENTO SEGUN LA VERSION Y EL TIPO DE DISPOSITIVO
		const Event = await db.Event.findOne({
			where: { id_event_influx: event.id, id_version: Recloser[0].version.id, type: typeDevice, alarm: 1 },
		})
		if (!Event) {
			return false
		}
		// BUSCO LA ALARMA Y SU ULTIMA FECHA DE EJECUCION PARA SABER SI PASO EL TIEMPO Y VOLVER A ENVIARLA.
		const Alarm_sent = await db.Alarms_sents.findOne({
			where: { id_device: Recloser[0].id, id_event: Event.id, type: typeDevice },
			order: [['createdAt', 'DESC']],
			limit: 1,
		})
		if (Alarm_sent) {
			const hourAgo = new Date(new Date() - 60 * 60 * 1000)
			if (Alarm_sent.updatedAt >= hourAgo) {
				return false
			}
		}
		const datareturn = {
			device: Recloser,
			event: Event,
			typeDevice: typeDevice,
		}
		return datareturn
	} catch (error) {
		console.error(`Error obteniendo la configuración MQTT: ${error.message}`)
		throw new Error(`Error al obtener configuración MQTT: ${error.message}`)
	}
}

/**
 * Obtiene un dispositivo recloser por su número de serie y marca.
 *
 * @param {string} nroSerie - El número de serie del dispositivo.
 * @param {string} brand - La marca del dispositivo.
 * @returns {Promise<Array>} Una lista de dispositivos recloser que coinciden con el número de serie y la marca.
 * @throws {Error} Si ocurre un error al buscar el dispositivo en la base de datos.
 * @author Jose Romani <jose.romani@hotmail.com>
 */
const getDevicexSerieBrand = async (nroSerie, brand) => {
	const Recloser = await db.Recloser.findAll({
		where: [{ serial: nroSerie }],
		include: [
			{
				association: 'version',
				required: true,
				include: [
					{
						association: 'brand',
						required: true,
						where: { name: brand },
					},
				],
			},
			{
				association: 'history',
			},
		],
	})
	const recoEnable = Recloser.filter((item) => item.version)
	return recoEnable
}

/**
 * Guarda o actualiza una alerta enviada para un dispositivo.
 *
 * @param {Object} data - Los datos de la alerta que se enviará, incluye id_device, type, id_event, entre otros.
 * @returns {Promise<Object>} La alerta enviada o actualizada en la base de datos.
 * @throws {Error} Si ocurre un error durante la transacción o la operación en la base de datos.
 * @author Jose Romani <jose.romani@hotmail.com>
 */

const saveAlertSend = async (data) => {
	return db.sequelize.transaction(async (t) => {
		try {
			const [Alarms_sents, created] = await db.Alarms_sents.findOrCreate({
				where: { id_device: data.id_device, type: data.type, id_event: data.id_event },
				defaults: { ...data },
				transaction: t,
			})
			if (!created) {
				await Alarms_sents.update({ status: 1 }, { transaction: t })
			}
			return Alarms_sents
		} catch (error) {
			throw error
		}
	})
}

/**
 * Guarda un registro en el log de alarmas.
 *
 * @param {Object} data - Los datos de la alarma que se guardarán en el log.
 * @returns {Promise<Object>} El log de la alarma creada en la base de datos.
 * @throws {Error} Si ocurre un error al crear el log en la base de datos.
 * @author Jose Romani <jose.romani@hotmail.com>
 */

const saveLogAlert = async (data) => {
	try {
		const Logs_Alarm = await db.Logs_Alarm.create(data)
		return Logs_Alarm
	} catch (error) {
		throw error
	}
}

const getAllEvents = async () => {
	const Events = await db.Event.findAll({
		where: { status: 1 },
	})
	const versions = await db.Version.findAll({
		where: { status: 1 },
		include: [
			{
				association: 'brand',
			},
		],
	})

	const dataResult = Events.reduce((acc, current) => {
		const version = versions.find((item) => item.id == current.id_version)
		if (!acc[current.type]) {
			acc[current.type] = { [version?.brand?.name]: { [version.name]: [] } }
		}
		if (!acc[current.type][version?.brand?.name]) {
			acc[current.type][version?.brand?.name][version.name] = []
		}
		acc[current.type][version?.brand?.name][version.name].push(current.get({ plain: true }))
		return acc
	}, {})

	return dataResult
}
const saveNotify = async (data) => {
	const dataResult = await db.Event.bulkCreate(data, {
		updateOnDuplicate: ['priority', 'alarm', 'flash_screen'],
	})
	return dataResult
}
module.exports = {
	searchEnableAlarm,
	getDevicexSerieBrand,
	saveAlertSend,
	saveLogAlert,
	getAllEvents,
	saveNotify,
}
