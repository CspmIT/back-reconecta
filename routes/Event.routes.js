const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	getConfigNotify,
	saveConfigNotify,
	sendConfigMQTT,
	AllEvents,
	saveLogsChecks,
	eventsDevices,
	updateConfigIndex,
	updateConfigNotify,
} = require('../controllers/Event.controller')
const router = express.Router()

router.get('/AllEvents', verifyToken, AllEvents)
router.get('/eventsDevices', verifyToken, eventsDevices)
router.post('/saveLogsChecks', verifyToken, saveLogsChecks)

router.get('/getConfigNotify', verifyToken, getConfigNotify)
router.post('/sendConfigMQTT', verifyToken, sendConfigMQTT)
router.post('/ConfigNotify', verifyToken, saveConfigNotify)
router.patch('/ConfigNotify', verifyToken, updateConfigNotify)
router.patch('/ConfigNotifyIndex', verifyToken, updateConfigIndex)

module.exports = router
