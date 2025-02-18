const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { getAnalyzer } = require('../controllers/Analyzer.controller')

const router = express.Router()

router.post('/Analyzer', verifyToken, getAnalyzer)

module.exports = router
