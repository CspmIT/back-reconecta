const express = require('express')
const { provisionClient, createInfluxBucket } = require('../controllers/Provision.controller')
const { provisionToken } = require('../middleware/Auth.middleware')
const router = express.Router()

router.post('/provision', provisionToken, provisionClient)
router.post('/provision/influx-bucket', provisionToken, createInfluxBucket)
module.exports = router
