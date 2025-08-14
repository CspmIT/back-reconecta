require('dotenv').config() // Para cargar las variables de entorno desde un archivo .env

module.exports = {
	morteros_energia: {
		INFLUX_URL: 'http://200.63.120.50:58086/',
		INFLUXDB_TOKEN: '6aS0VvvVlCop1Ry_NCOH4xxqX5Xwun9xv8vVu8eg6ipZWt0Vh9FMMeWopRQeq-eMkbzc7_qq0nwnErort9XjRw==',
		INFLUX_TOKEN: '6aS0VvvVlCop1Ry_NCOH4xxqX5Xwun9xv8vVu8eg6ipZWt0Vh9FMMeWopRQeq-eMkbzc7_qq0nwnErort9XjRw==',
		INFLUX_ORG: 'CoopMorteros',
		INFLUX_ORG_ID: '759abf3b524d2437',
		INFLUX_BUCKET: 'ENERGIA',
	},
	externos: {
		INFLUX_URL: 'http://172.26.5.50:8086/',
		INFLUXDB_TOKEN: 'y2quVyt0bou-eiGfu9U-q3dYCKbq6ESU-sWU_6BPGa3hgnPmxTHlPKX8vTfL0kALogJbmIYoO3u4C3p7XQdUIg==',
		INFLUX_TOKEN: 'y2quVyt0bou-eiGfu9U-q3dYCKbq6ESU-sWU_6BPGa3hgnPmxTHlPKX8vTfL0kALogJbmIYoO3u4C3p7XQdUIg==',
		INFLUX_ORG: 'CoopMorteros',
		INFLUX_ORG_ID: '9a05c7780ebb0dc1',
		INFLUX_BUCKET: 'IOT-ENERGIA',
	},
}
