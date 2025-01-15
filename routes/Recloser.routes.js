const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const router = express.Router()
const {
	listAllRecloser,
	getRecloserxID,
	getDataInfluxRecloser,
	metrologiaIntantanea,
	listEvents,
	tensionABCGraf,
	corrientesGraf,
	interruptions,
	addRecloser,
	getVersions,
	deleteRecloser,
	unlinkRelation,
	listReclosersEnabled,
	getDataMap,
	controlAction,
	changeStatusAlarm,
	recloserAlarm,
	getAcRecloser,
	manauvers,
} = require('../controllers/Recloser.controller')
const { testMQTT, sendMQTT } = require('../controllers/Mqtt.controller')

router.get('/getDataRecloser', verifyToken, getDataInfluxRecloser)
router.post('/changeStatusAlarm', verifyToken, changeStatusAlarm)
router.get('/getAllReclosers', verifyToken, listAllRecloser)
router.get('/getReclosersEnabled', verifyToken, listReclosersEnabled)
router.get('/getRecloserxID', verifyToken, getRecloserxID)
router.get('/getVersionsRecloser', verifyToken, getVersions)
router.get('/metrologiaIntantanea', verifyToken, metrologiaIntantanea)
router.get('/listEvents', verifyToken, listEvents)
router.get('/tensionABC', verifyToken, tensionABCGraf)
router.get('/corrientesGraf', verifyToken, corrientesGraf)
router.get('/interruptions', verifyToken, interruptions)
router.get('/manauvers', verifyToken, manauvers)

router.post('/addRecloser', verifyToken, addRecloser)
router.post('/deleteRecloser', verifyToken, deleteRecloser)
router.post('/unlinkRelation', verifyToken, unlinkRelation)

router.get('/getDataMap', verifyToken, getDataMap)

router.get('/recloserAlarm', verifyToken, recloserAlarm)
router.get('/getAcRecloser', verifyToken, getAcRecloser)
// Section MQTT
router.get('/testMQTT', testMQTT)
router.post('/sendMQTT', verifyToken, sendMQTT)
router.post('/controlAction', verifyToken, controlAction)

module.exports = router
