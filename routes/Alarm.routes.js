const express = require('express')
const { influxAlarm, influxAlarmDeadman } = require('../controllers/Alarma.controller')
const { alarmToken } = require('../middleware/Auth.middleware')
const router = express.Router()

router.post('/alarmInflux/:scheme', alarmToken, influxAlarm)
router.post('/alarmDeadmanInflux/:scheme', influxAlarmDeadman)
module.exports = router
