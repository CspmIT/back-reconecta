// const TelegramBot = require('node-telegram-bot-api')
// const crypto = require('crypto')
// const telegramConf = require('../config/telegram.conf')
const config_influx = require('../config/config_influx')
const { searchEnableAlarm, saveAlertSend, saveLogAlert } = require('../services/EventService')
const { createTask, saveTest, formaterDataAlarm } = require('../services/InfluxServices')
const { searchRelationActive } = require('../services/NodeService')
const { sendMsjTelegram } = require('../services/TelegramService')
// const sendMsjTelegram = async (req, res) => {
// 	const token = telegramConf[req.user.name_coop].token
// 	const bot = new TelegramBot(token, { polling: false })
// 	const chatId = telegramConf[req.user.name_coop].chatIdReconecta
// 	bot.sendMessage(chatId, '¡Hola desde Node.js!')
// 		.then((response) => {
// 			console.log('Mensaje enviado:', response)
// 			bot.stopPolling()
// 			return res.status(200).json({ result: 'Se envio correctamente' })
// 		})
// 		.catch((err) => {
// 			console.error('Error enviando mensaje:', err)
// 			bot.stopPolling()
// 			return res.status(400).json({ result: 'Error enviando mensaje:' + err })
// 		})
// }
const contrlAlarm = async (req, res) => {
	try {
		const url = config_influx[req.query.influx_name].INFLUX_URL + 'api/v2/tasks'
		const token = config_influx[req.query.influx_name].INFLUXDB_TOKEN
		const org = config_influx[req.query.influx_name].INFLUX_ORG
		// const orgID = config_influx[req.query.influx_name].INFLUX_ORG
		// const bucket = config_influx[req.query.influx_name].INFLUX_BUCKET
		const telegramEndpoint = 'http://localhost:4000/api/sendMsjTelegram'
		try {
			const taskData = await createTask(url, token, org, telegramEndpoint)
			return res.status(200).json({ data: taskData })
		} catch (error) {
			return res.status(400).json({ data: error })
		}
	} catch (error) {
		if (error.errors) {
			return res.status(500).json(error.errors)
		} else {
			return res.status(400).json(error.message)
		}
	}
}
const alarmRecloser = async (req, res) => {
	try {
		const dataFormater = await formaterDataAlarm(req.body)
		// Filtrar por id único y quedarnos con el último registro basado en _time
		const uniqueData = dataFormater.reduce((acc, current) => {
			if (!acc[current.id] || new Date(acc[current.id]._time) < new Date(current._time)) {
				acc[current.id] = current
			}
			return acc
		}, {})
		const filteredData = Object.values(uniqueData)
		const alarmSend = []
		for (const item of filteredData) {
			const eventEnable = await searchEnableAlarm(item)
			if (eventEnable) {
				const nodo = eventEnable.device?.[0]?.history
					? await searchRelationActive(eventEnable.device?.[0].id, 1)
					: false
				alarmSend.push(item)
				const message = `Alarma en reconectador ${nodo?.nodes?.number} - ${nodo?.nodes?.name}, evento: ${eventEnable.event?.name}`
				const send = await sendMsjTelegram(message)
				const dataSend = {
					id_device: eventEnable.device[0].id,
					type: eventEnable.typeDevice,
					id_event: eventEnable.event.id,
					status: 1,
					error: !send?.status ? send.err : '',
				}
				if (send?.status) {
					await saveAlertSend(dataSend)
				}
				await saveLogAlert(dataSend)
			}
		}
		return res.status(200).json(alarmSend)
	} catch (error) {
		console.error('Error procesando la alarma:', error)
		res.status(500).json({
			message: 'Error procesando la alarma',
		})
	}
}

module.exports = {
	sendMsjTelegram,
	contrlAlarm,
	alarmRecloser,
}
