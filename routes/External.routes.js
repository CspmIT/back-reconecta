const express = require('express')
const { apiKeyAuth, requireScope } = require('../middleware/ApiKey.middleware')
const {
	me,
	openapi,
	getEquipments,
	getEquipment,
	getInstant,
	getHistory,
	getEvents,
	getAlarms,
} = require('../controllers/External.controller')
const router = express.Router()

// API externa v1, de solo lectura. Se monta en /api/v1/external y autentica
// con token de API, no con la sesion de la app.

// La especificacion es publica: la usa la pantalla de documentacion del front
// y no expone datos de la cooperativa.
router.get('/openapi.json', openapi)

router.get('/me', apiKeyAuth, me)
router.get('/equipments', apiKeyAuth, requireScope('equipments:read'), getEquipments)
router.get('/equipments/:serial', apiKeyAuth, requireScope('equipments:read'), getEquipment)
router.get('/equipments/:serial/instant', apiKeyAuth, requireScope('metrology:read'), getInstant)
router.get('/equipments/:serial/history', apiKeyAuth, requireScope('metrology:read'), getHistory)
router.get('/equipments/:serial/events', apiKeyAuth, requireScope('events:read'), getEvents)
router.get('/alarms', apiKeyAuth, requireScope('events:read'), getAlarms)

module.exports = router
