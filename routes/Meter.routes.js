const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { getVersions, addMeter, listMeter, metersEnabled } = require('../controllers/Meter.controller')
const router = express.Router()
router.get('/getVersionsMeter', verifyToken, getVersions)
router.get('/getListMeter', verifyToken, listMeter)
router.get('/getMetersEnabled', verifyToken, metersEnabled)
router.post('/addMeter', verifyToken, addMeter)

module.exports = router
