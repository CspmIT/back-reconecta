require('dotenv').config() // Para cargar las variables de entorno desde un archivo .env

module.exports = {
	morteros_energia: {
		INFLUX_URL: 'http://200.63.120.50:58086/',
		INFLUXDB_TOKEN: 'fmR9EqpSjpmu_fzMEpBXBO0Tqrku7Xvcuz712raFE1g-_ic5_9BOeB_d8JMpb6LHBItVHICjPYGwbYwzaGUuZw==',
		INFLUX_ORG: 'CoopMorteros',
		INFLUX_BUCKET: 'ENERGIA',
	},
	externos: {
		INFLUX_URL: '',
		INFLUXDB_TOKEN: '',
		INFLUX_ORG: '',
		INFLUX_BUCKET: '',
	},
}
