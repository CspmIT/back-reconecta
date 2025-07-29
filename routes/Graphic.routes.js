const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { saveSunBurst, getSunBurst } = require('../controllers/Graphic.controller')
const router = express.Router()

router.post('/Sunburst', verifyToken, saveSunBurst)
router.get('/Sunburst', verifyToken, getSunBurst)

module.exports = router
