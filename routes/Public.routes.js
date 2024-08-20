const express = require('express')
const { InfluxConection } = require('../controllers/Influx.controllers')
const { listAllRecloser, getRecloserxID, getDataInfluxRecloser } = require('../controllers/Recloser.controllers')
const router = express.Router()

router.get('/getDataRecloser', getDataInfluxRecloser)
router.get('/getAllReclosers', listAllRecloser)
router.get('/getRecloserxID', getRecloserxID)
router.get('/getInflux', InfluxConection)
module.exports = router
