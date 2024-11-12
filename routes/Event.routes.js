const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	getConfigNotify,
	saveConfigNotify,
	sendConfigMQTT,
	AllEvents,
	saveLogsChecks,
	eventsDevices,
} = require('../controllers/Event.controller')
const router = express.Router()

router.get('/AllEvents', verifyToken, AllEvents)
router.get('/eventsDevices', verifyToken, eventsDevices)
router.post('/saveLogsChecks', verifyToken, saveLogsChecks)

router.get('/getConfigNotify', getConfigNotify)
router.post('/sendConfigMQTT', sendConfigMQTT)
router.post('/ConfigNotify', saveConfigNotify)

module.exports = router
