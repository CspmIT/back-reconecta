const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { getMetrology, getHistory } = require('../controllers/Analyzer.controller')

const router = express.Router()

router.post('/Analyzer', verifyToken, getMetrology)
router.post('/AnalyzerHistory', verifyToken, getHistory)

module.exports = router
