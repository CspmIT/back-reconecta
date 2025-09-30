const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	listElements,
	addElement,
	listModels,
	listEquipments,
	addEquipment,
	editElement,
	addSubstationPat,
	listSubstationPat,
	editSubstationClient,
} = require('../controllers/Element.controller')
const router = express.Router()

router.get('/Elements', verifyToken, listElements)
router.get('/Elements/:id', verifyToken, listElements)
router.post('/Elements', verifyToken, addElement)
router.patch('/Elements', verifyToken, editElement)
router.get('/ElementsModel', verifyToken, listModels)
router.get('/Equipments', verifyToken, listEquipments)
router.get('/Equipment/:id', verifyToken, listEquipments)
router.post('/Equipment', verifyToken, addEquipment)
router.patch('/Equipment', verifyToken, addEquipment)
//SUBESTACIONES
router.patch('/SubstationClient', verifyToken, editSubstationClient)
router.post('/SubstationPat', verifyToken, addSubstationPat)
router.get('/SubstationPat/:id/:status', verifyToken, listSubstationPat)

module.exports = router
