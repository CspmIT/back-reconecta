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
} = require('../controllers/Recloser.controllers')

router.get('/getDataRecloser', verifyToken, getDataInfluxRecloser)
router.get('/getAllReclosers', verifyToken, listAllRecloser)
router.get('/getReclosersEnabled', verifyToken, listReclosersEnabled)
router.get('/getRecloserxID', verifyToken, getRecloserxID)
router.get('/getVersions', verifyToken, getVersions)
router.get('/metrologiaIntantanea', verifyToken, metrologiaIntantanea)
router.get('/listEvents', verifyToken, listEvents)
router.get('/tensionABC', verifyToken, tensionABCGraf)
router.get('/corrientesGraf', verifyToken, corrientesGraf)
router.get('/interruptions', verifyToken, interruptions)

router.post('/addRecloser', verifyToken, addRecloser)
router.post('/deleteRecloser', verifyToken, deleteRecloser)
router.post('/unlinkRelation', verifyToken, unlinkRelation)

module.exports = router
