const socketIo = require('socket.io')
const { db } = require('../models')
const jwt = require('jsonwebtoken')
const { changeSchema } = require('../models')
const { getEventsInflux, getEventsActive } = require('../services/EventService')
const secret = process.env.SECRET
let io

module.exports = {
	init: (server, req, res) => {
		io = socketIo(server, {
			path: '/api/socket.io',
			cors: {
				origin: '*',
				methods: ['GET', 'POST'],
			},
		})

		io.on('connect', (socket) => {
			let previousAlertState = null
			const checkAlerts = async () => {
				try {
					const { token } = socket.handshake.query
					if (!token) {
						console.error('Token no proporcionado')
						return
					}
					const decoded = jwt.verify(token, secret)
					await changeSchema(decoded.iss.substring(4))

					const events = await getEventsActive()
					const eventsInflux = await getEventsInflux(decoded.influx_name, events)

					const activeAlerts = eventsInflux
						.flat()
						.sort((a, b) => new Date(b.dateAlert) - new Date(a.dateAlert))
						.filter((event) => event.statusAlert == 1 && event.priority == 1).length

					const activeStatus = activeAlerts > 0

					if (activeStatus !== previousAlertState) {
						socket.emit('alert-active', { active: activeStatus })
						previousAlertState = activeStatus
					}
				} catch (error) {
					console.error('Error en checkAlerts:', error)
				}
			}

			// Ejecuta la verificación de alertas cada 5 segundos
			const intervalId = setInterval(checkAlerts, 5000)

			socket.on('access-config', async (user, callbackFunction) => {
				socket.userID = user
				const [Parameter, created] = await db.Parameter.findOrCreate({
					where: [{ type: 'Config' }, { name: 'userActConfig' }],
					defaults: { name: 'userActConfig', type: 'Config', value: user },
				})
				if (created || Parameter.value == user || Parameter.value == 0) {
					Parameter.update({ value: user })
					callbackFunction(true) // Responder al cliente que tiene acceso
				} else {
					callbackFunction(false) // Responder al cliente que no tiene acceso
				}
			})
			socket.on('disconnect', async () => {
				if (intervalId) {
					clearInterval(intervalId)
				}
				if (socket.userID) {
					const parameter = await db.Parameter.findOne({
						where: [{ name: 'userActConfig' }],
					})
					if (parameter.value == socket.userID) {
						await db.Parameter.update(
							{ value: 0 },
							{ where: [{ type: 'Config' }, { name: 'userActConfig' }] }
						)
					}
				}
				console.log('Cliente desconectado:', socket.id)
			})
		})

		return io
	},

	getIo: () => {
		if (!io) {
			throw new Error('Socket.io not initialized!')
		}
		return io
	},
}
