const socketIo = require('socket.io')
let io

module.exports = {
	init: (server) => {
		io = socketIo(server, {
			cors: {
				origin: '*',
				methods: ['GET', 'POST'],
			},
		})

		io.on('connect', (socket) => {
			socket.on('access-config', async (callback) => {
				const allUser = await io.allSockets()
				if (allUser.size > 1) {
					callback(false) // Responder al cliente que no tiene acceso
				} else {
					callback(true) // Responder al cliente que tiene acceso
				}
			})

			socket.on('disconnect', () => {
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
