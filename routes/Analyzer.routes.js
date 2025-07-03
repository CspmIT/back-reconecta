const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { getMetrology, getHistory, getGraphics, getMonthData } = require('../controllers/Analyzer.controller')

const router = express.Router()

router.post('/Analyzer', verifyToken, getMetrology)
router.post('/AnalyzerHistory', verifyToken, getHistory)
router.post('/AnalyzerGraphics', verifyToken, getGraphics)
router.post('/AnalyzerMonths', verifyToken, getMonthData)

module.exports = router
