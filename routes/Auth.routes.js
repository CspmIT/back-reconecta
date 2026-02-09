const express = require('express')
const { loginCooptech, relationUserCooptech, loginCooptechExternal } = require('../controllers/Cooptech.controller')
const router = express.Router()

// RUTAS PARA AUTH
router.post('/loginCooptech', loginCooptech)
router.post('/generateTokenCooptech', loginCooptechExternal)

// RUTAS PARA COOPTECH
router.post('/relationUserCooptech', relationUserCooptech)

module.exports = router
