const express = require('express')
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
const router = express.Router()
router.get('/getDataRecloser', getDataInfluxRecloser)
router.get('/getAllReclosers', listAllRecloser)
router.get('/getReclosersEnabled', listReclosersEnabled)
router.get('/getRecloserxID', getRecloserxID)
router.get('/getVersions', getVersions)
router.get('/metrologiaIntantanea', metrologiaIntantanea)
router.get('/listEvents', listEvents)
router.get('/tensionABC', tensionABCGraf)
router.get('/corrientesGraf', corrientesGraf)
router.get('/interruptions', interruptions)

router.post('/addRecloser', addRecloser)
router.post('/deleteRecloser', deleteRecloser)
router.post('/unlinkRelation', unlinkRelation)

module.exports = router
