const { Client } = require('ssh2')
const config_ssh = require(__dirname + '/../config/config_ssh.js')

const uploadFile = async (indexes, name) => {
	try {
		const data = {
			event_ids: indexes,
		}
		const jsonContent = JSON.stringify(data, null, 2)
		const connSettings = {
			host: config_ssh['mqtt_morteros'].SSH_CON,
			port: 22,
			username: config_ssh['mqtt_morteros'].SSH_USER,
			password: config_ssh['mqtt_morteros'].SSH_PWD,
		}
		const path = config_ssh['mqtt_morteros'].SSH_PATH + name
		const conn = new Client()
		conn.on('ready', () => {
			conn.sftp((err, sftp) => {
				if (err) throw err

				const writeStream = sftp.createWriteStream(path)

				writeStream.on('close', () => {
					console.log('Archivo subido correctamente.')
					conn.end()
				})

				writeStream.on('end', () => {
					console.log('Stream finalizado.')
				})
				console.log('intento carga archivo')

				writeStream.write(jsonContent)
				writeStream.end()
			})
		})

		conn.on('error', (err) => {
			throw err
		})

		conn.connect(connSettings)
		return true
	} catch (e) {
		throw e
	}
}

module.exports = {
	uploadFile,
}
