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
	addSubstationClient,
	deleteSubstationClient,
	addImageElement,
} = require('../controllers/Element.controller')
const router = express.Router()

router.get('/Elements', verifyToken, listElements)
router.get('/Elements/:id', verifyToken, listElements)
router.post('/Elements', verifyToken, addElement)
router.patch('/Elements', verifyToken, editElement)
router.patch('/ElementsImage', verifyToken, addImageElement)
router.get('/ElementsModel', verifyToken, listModels)
router.get('/Equipments', verifyToken, listEquipments)
router.get('/Equipment/:id', verifyToken, listEquipments)
router.post('/Equipment', verifyToken, addEquipment)
router.patch('/Equipment', verifyToken, addEquipment)
//SUBESTACIONES
router.patch('/SubstationClient', verifyToken, editSubstationClient)
router.post('/SubstationClient', verifyToken, addSubstationClient)
router.delete('/SubstationClient', verifyToken, deleteSubstationClient)
router.post('/SubstationPat', verifyToken, addSubstationPat)
router.post('/SubstationPatFilter', verifyToken, listSubstationPat)

module.exports = router
