require('dotenv').config() // Para cargar las variables de entorno desde un archivo .env

module.exports = {
	coopm_v1: {
		username: 'DbDesarrollo',
		password: process.env.DB_PASS,
		database: 'coopm_v1',
		host: process.env.DB_HOST,
		port: process.env.DB_PORT || 3306,
		dialect: 'mysql',
	},
	coopm_v2: {
		username: 'DbDesarrollo',
		password: process.env.DB_PASS,
		database: 'coopm_v2',
		host: process.env.DB_HOST,
		port: process.env.DB_PORT || 3306,
		dialect: 'mysql',
		timezone: 'America/Argentina/Buenos_Aires',
	},
	reconecta: {
		username: 'DbDesarrollo',
		password: process.env.DB_PASS,
		database: 'reconecta_desarrollo',
		host: process.env.DB_HOST,
		port: process.env.DB_PORT || 3306,
		dialect: 'mysql',
		timezone: 'America/Argentina/Buenos_Aires',
	},
	procoop: {
		database: 'PR_MT_NUEVA_DEMO',
		username: 'Oficina',
		password: 'Serversql2021',
		host: '192.168.0.160',
		port: 9387,
		dialect: 'mssql',
	},
	procoopOncativo: {
		database: 'PR_ONC_DEMO',
		username: 'ENRIQUE',
		password: 'procoop123',
		host: '192.168.0.239',
		port: 1433,
		dialect: 'mssql',
	},
}
