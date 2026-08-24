const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	getMapConfig,
	editMapConfig,
	listLines,
	addLine,
	editLine,
	deleteLine,
	listElementUsage,
	liveData,
} = require('../controllers/Map.controller')

const router = express.Router()

// Vista por defecto (un solo mapa)
router.get('/map', verifyToken, getMapConfig)
router.patch('/map', verifyToken, editMapConfig)

// Datos en vivo agregados de todos los elementos
router.get('/map/live', verifyToken, liveData)

// Tramos de la red
router.get('/map/lines', verifyToken, listLines)
router.get('/map/lines/:id', verifyToken, listLines)
router.post('/map/lines', verifyToken, addLine)
router.put('/map/lines/:id', verifyToken, editLine)
router.delete('/map/lines/:id', verifyToken, deleteLine)

// Tramos que dependen de un elemento, para el ABM
router.get('/map/elementUsage/:id', verifyToken, listElementUsage)

module.exports = router
