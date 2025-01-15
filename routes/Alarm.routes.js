const express = require('express')
const { sendMsjTelegram, contrlAlarm, alarmRecloser } = require('../controllers/Alarma.controller')
const { verifyToken } = require('../middleware/Auth.middleware')
const router = express.Router()

router.get('/sendMsjTelegram', verifyToken, sendMsjTelegram)
router.post('/alarmRecloser', alarmRecloser)
router.get('/contrlAlarm', contrlAlarm)
module.exports = router
