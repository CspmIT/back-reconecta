const express = require('express')
const { getDashboard, getMovementsList } = require('../controllers/Audit.controller')
const { verifyToken } = require('../middleware/Auth.middleware')
const router = express.Router()

// RUTAS PARA AUDITORIA
router.get('/audit/dashboard', verifyToken, getDashboard)
router.get('/audit/movements', verifyToken, getMovementsList)

module.exports = router
