const express = require('express')
const { provisionClient } = require('../controllers/Provision.controller')
const { provisionToken } = require('../middleware/Auth.middleware')
const router = express.Router()

router.post('/provision', provisionToken, provisionClient)
module.exports = router
