const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { getConfigNotify, saveConfigNotify } = require('../controllers/Event.controllers')
const router = express.Router()

router.get('/getConfigNotify', getConfigNotify)
router.post('/ConfigNotify', saveConfigNotify)

module.exports = router
