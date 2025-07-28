const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { saveGraphic } = require('../controllers/Graphic.controller')
const router = express.Router()

router.post('/Graphic', verifyToken, saveGraphic)

module.exports = router
