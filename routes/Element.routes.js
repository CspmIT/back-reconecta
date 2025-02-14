const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	listElements,
	addElement,
	listModels,
	listEquipments,
	addEquipment,
} = require('../controllers/Element.controller')
const router = express.Router()

router.get('/Elements', verifyToken, listElements)
router.post('/Elements', verifyToken, addElement)
router.get('/ElementsModel', verifyToken, listModels)
router.get('/Equipment/:id', verifyToken, listEquipments)
router.post('/Equipment', verifyToken, addEquipment)
router.patch('/Equipment', verifyToken, addEquipment)

module.exports = router
