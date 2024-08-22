const express = require('express')
const { listAllRecloser, getRecloserxID, getDataInfluxRecloser, migrationRecloser, metrologiaIntantanea, listEvents } = require('../controllers/Recloser.controllers')
const router = express.Router()

router.get('/migrationRecloser', migrationRecloser)
router.get('/getDataRecloser', getDataInfluxRecloser)
router.get('/getAllReclosers', listAllRecloser)
router.get('/getRecloserxID', getRecloserxID)
router.get('/metrologiaIntantanea', metrologiaIntantanea)
router.get('/listEvents', listEvents)
module.exports = router
