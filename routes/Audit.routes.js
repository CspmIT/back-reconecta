const express = require('express')
const { getDashboard, getMovementsList, getOrganizations } = require('../controllers/Audit.controller')
const { verifyToken } = require('../middleware/Auth.middleware')
const router = express.Router()

// RUTAS PARA AUDITORIA
router.get('/audit/dashboard', verifyToken, getDashboard)
router.get('/audit/movements', verifyToken, getMovementsList)
router.get('/audit/organizations', verifyToken, getOrganizations)

module.exports = router
