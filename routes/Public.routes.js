const express = require('express')
const { listAllRecloser, getRecloserxID, getDataInfluxRecloser, migrationRecloser, metrologiaIntantanea, listEvents, tensionABCGraf, corrientesGraf, interruptions } = require('../controllers/Recloser.controllers')
const router = express.Router()
// Rutas de reconectadores
router.get('/migrationRecloser', migrationRecloser)
router.get('/getDataRecloser', getDataInfluxRecloser)
router.get('/getAllReclosers', listAllRecloser)
router.get('/getRecloserxID', getRecloserxID)
router.get('/metrologiaIntantanea', metrologiaIntantanea)
router.get('/listEvents', listEvents)
router.get('/tensionABC', tensionABCGraf)
router.get('/corrientesGraf', corrientesGraf)
router.get('/interruptions', interruptions)

module.exports = router
