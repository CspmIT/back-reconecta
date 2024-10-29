const socketIo = require('socket.io')
const { db } = require('../models')
const { where } = require('sequelize')
let io

module.exports = {
	init: (server) => {
		io = socketIo(server, {
			path: '/api/socket.io',
			cors: {
				origin: '*',
				methods: ['GET', 'POST'],
			},
		})

		io.on('connect', (socket) => {
			socket.on('access-config', async (user, callbackFunction) => {
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
			socket.on('disconnect-acces-config', async (user) => {
				const Parameter = await db.Parameter.findOne({
					where: [{ name: 'userActConfig' }, { value: user }],
				})
				if (!Parameter) {
					await db.Parameter.update({ value: 0 }, { where: [{ type: 'Config' }, { name: 'userActConfig' }] })
				}
			})

			socket.on('disconnect', async () => {
				//
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
