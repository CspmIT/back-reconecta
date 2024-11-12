const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { getVersions, addMeter } = require('../controllers/Meter.controller')
const router = express.Router()
router.get('/getVersionsMeter', verifyToken, getVersions)
router.post('/addMeter', verifyToken, addMeter)

module.exports = router
