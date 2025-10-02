const express = require('express')
const { db } = require('../models')
const { influxTask } = require('../controllers/Influx.controller')
const { importConfigInitial } = require('../controllers/Event.controller')
const router = express.Router()

// router.get('/interruptions', interruptions)
router.get('/test', async (req, res) => {
	db.sequelize
		.authenticate()
		.then(() => {
			res.json('conexion exitosa')
		})
		.catch((err) => {
			return res.status(401).json({ err: err.stack })
		})
})
/* router.get('/testInflux', influxTask) */
/* router.get('/configInitial', importConfigInitial) */
module.exports = router
