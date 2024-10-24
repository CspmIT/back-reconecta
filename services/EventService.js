const { db } = require('../models')

const typeDeviceInflux = {
	Reconectadores: 'Recloser',
	Analizador: 'Analizador',
	Meter: 'Medidor',
}
/**
 * Obtiene la configuración MQTT de una cooperativa desde la base de datos.
 *
 * @returns {Promise<Object>} Un objeto con la configuración MQTT que incluye el host, puerto y contraseña.
 * @throws {Error} Si no se encuentran los parámetros necesarios en la base de datos.
 * @author  Jose Romani <jose.romani@hotmail.com>
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
const saveLogAlert = async (data) => {
	try {
		const Logs_Alarm = await db.Logs_Alarm.create(data)
		return Logs_Alarm
	} catch (error) {
		throw error
	}
}
module.exports = {
	searchEnableAlarm,
	getDevicexSerieBrand,
	saveAlertSend,
	saveLogAlert,
}
