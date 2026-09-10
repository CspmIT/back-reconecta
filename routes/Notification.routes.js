const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	publicKey,
	subscribe,
	unsubscribe,
	devices,
	sendTest,
	getPreferences,
	updatePreferences,
	preferenceOptions,
} = require('../controllers/Notification.controller')
const router = express.Router()

// Suscripcion de cada dispositivo al Web Push (una fila por navegador).
router.get('/push/publicKey', verifyToken, publicKey)
router.get('/push/devices', verifyToken, devices)
router.post('/push/subscribe', verifyToken, subscribe)
router.post('/push/unsubscribe', verifyToken, unsubscribe)
router.post('/push/test', verifyToken, sendTest)

// Preferencias de notificacion del usuario: horario de silencio y silenciados.
router.get('/notificationPref/options', verifyToken, preferenceOptions)
router.get('/notificationPref', verifyToken, getPreferences)
router.put('/notificationPref', verifyToken, updatePreferences)

module.exports = router
