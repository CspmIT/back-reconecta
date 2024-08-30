const express = require('express')
const { loginCooptech, relationUserCooptech } = require('../controllers/Cooptech.controllers')
const router = express.Router()

// RUTAS PARA AUTH
router.post('/loginCooptech', loginCooptech)
router.post('/generateTokenCooptech', loginCooptech)

// RUTAS PARA COOPTECH
router.post('/relationUserCooptech', relationUserCooptech)

module.exports = router
