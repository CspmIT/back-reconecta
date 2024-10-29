'use strict'

const config_Mqtt = require('../config/config_Mqtt')
const { telegramConf } = require('../config/telegram.conf')
const { encrypt } = require('../utils/js/encrypt')

// Query para la ejecucion de este seeder:
// npx sequelize-cli db:seed --seed 20241021133353-Parameters.js --env reconecta --config config/config.js -- nameSchema:my_schema

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const date = new Date()
		// Capturar el esquema desde los argumentos
		const schema = process.argv.find((item) => item.includes('nameSchema:'))?.split(':')?.[1] || ''
		if (schema === '') throw new Error('Falta el schema de la base de datos!')
		const token = await encrypt(telegramConf[schema].reconecta.token)
		const chat = await encrypt(telegramConf[schema].reconecta.chatIdReconecta)
		const host = await encrypt(config_Mqtt[schema].host)
		const port = await encrypt(config_Mqtt[schema].port)
		const password = await encrypt(config_Mqtt[schema].password)
		const username = await encrypt(config_Mqtt[schema].username)
		const protocol = await encrypt(config_Mqtt[schema].protocol)
		const clientId = await encrypt(config_Mqtt[schema].clientId)
		const clean = await encrypt(config_Mqtt[schema].clean)
		await queryInterface.bulkInsert(
			'Parameters',
			[
				//token de telegram del grupo de reconectador
				{
					name: 'Token_recloser',
					type: 1,
					value: JSON.stringify(token),
					createdAt: date,
					updatedAt: date,
				},
				//chat id de telegram del grupo de reconectador
				{
					name: 'Chat_Id_recloser',
					type: 1,
					value: JSON.stringify(chat),
					createdAt: date,
					updatedAt: date,
				},
				// host de Mqtt
				{ name: 'host', type: 2, value: JSON.stringify(host), createdAt: date, updatedAt: date },
				// host de Mqtt
				{ name: 'port', type: 2, value: JSON.stringify(port), createdAt: date, updatedAt: date },
				// password de Mqtt
				{ name: 'password', type: 2, value: JSON.stringify(password), createdAt: date, updatedAt: date },
				// username de Mqtt
				{ name: 'username', type: 2, value: JSON.stringify(username), createdAt: date, updatedAt: date },
				// protocol de Mqtt
				{ name: 'protocol', type: 2, value: JSON.stringify(protocol), createdAt: date, updatedAt: date },
				// clientId de Mqtt
				{ name: 'clientId', type: 2, value: JSON.stringify(clientId), createdAt: date, updatedAt: date },
				// clean de Mqtt
				{ name: 'clean', type: 2, value: JSON.stringify(clean), createdAt: date, updatedAt: date },
			],
			{}
		)
	},

	async down(queryInterface, Sequelize) {
		// Para revertir los cambios en el seed
	},
}
