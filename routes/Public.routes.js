const express = require('express')
const { listAllRecloser, getRecloserxID, getDataInfluxRecloser } = require('../controllers/Recloser.controllers')
const router = express.Router()

router.get('/getDataRecloser', getDataInfluxRecloser)
router.get('/getAllReclosers', listAllRecloser)
router.get('/getRecloserxID', getRecloserxID)
module.exports = router
