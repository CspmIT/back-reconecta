const TelegramBot = require('node-telegram-bot-api')
const { db } = require('../models')
const { decrypt } = require('../utils/js/encrypt')
const getDataConnectTelegram = async () => {
	try {
		const parameters = await db.Parameter.findAll({
			where: { type: 1 },
		})
		if (parameters.length === 0) {
			throw new Error('No se encontraron parámetros MQTT en la base de datos')
		}

		const data = parameters.reduce((acc, param) => {
			acc[param.name.toLowerCase()] = decrypt(param.value)
			return acc
		}, {})

		const config = {
			...data,
		}
		return config
	} catch (error) {
		console.error(`Error obteniendo la configuración Telegram: ${error.message}`)
		throw new Error(`Error al obtener configuración Telegram: ${error.message}`)
	}
}
/**
 * Obtiene todos los reconectadores de la base de datos de Desarrollo.
 *
 * @returns {Promise<Array<Object>>} Un arreglo de objetos que representan todos los reconectadores encontrados, o lanza un error si no se encuentra ninguno.
 * @author  [Jose Romani] <jose.romani@hotmail.com>
 *
 */
const sendMsjTelegram = async (message) => {
	try {
		const { token_recloser, chat_id_recloser } = await getDataConnectTelegram()
		const bot = new TelegramBot(token_recloser, { polling: false })
		const dataReturn = {}
		await bot
			.sendMessage(chat_id_recloser, message)
			.then((response) => {
				bot.stopPolling()
				console.log('Mensaje enviado correctamente')
				dataReturn.status = true
			})
			.catch((err) => {
				bot.stopPolling()
				console.log('No se envió el mensaje correctamente: ' + err)
				dataReturn.status = false
				dataReturn.err = err
			})

		return dataReturn
	} catch (error) {
		throw error
	}
}

module.exports = {
	sendMsjTelegram,
}
