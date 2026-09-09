const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { dashboardCounters } = require('../controllers/Dashboard.controller')

const router = express.Router()

// Tarjetas del Home
router.get('/dashboard', verifyToken, dashboardCounters)

module.exports = router
