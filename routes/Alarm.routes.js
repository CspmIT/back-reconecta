const express = require('express')
const { influxAlarm } = require('../controllers/Alarma.controller')
const { alarmToken } = require('../middleware/Auth.middleware')
const router = express.Router()

router.get('/alarmInflux/:scheme', alarmToken, influxAlarm)
module.exports = router
