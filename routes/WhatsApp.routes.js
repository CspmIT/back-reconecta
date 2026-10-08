const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	status,
	link,
	removeLink,
	updateEnabled,
	sendTest,
	webhookVerify,
	webhookReceive,
} = require('../controllers/WhatsApp.controller')
const router = express.Router()

// Vinculacion del telefono del usuario con el numero de alertas.
router.get('/whatsapp/status', verifyToken, status)
router.post('/whatsapp/link', verifyToken, link)
router.delete('/whatsapp/link', verifyToken, removeLink)
router.put('/whatsapp/enabled', verifyToken, updateEnabled)
router.post('/whatsapp/test', verifyToken, sendTest)

// Webhook de Meta: sin token propio, el POST se valida con la firma del body.
router.get('/whatsapp/webhook', webhookVerify)
router.post('/whatsapp/webhook', webhookReceive)

module.exports = router
