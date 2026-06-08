const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	listElementTypes,
	addElementType,
	editElementType,
	deleteElementType,
} = require('../controllers/ElementType.controller')
const router = express.Router()

router.get('/ElementTypes', verifyToken, listElementTypes)
router.post('/ElementType', verifyToken, addElementType)
router.patch('/ElementType', verifyToken, editElementType)
router.delete('/ElementType', verifyToken, deleteElementType)

module.exports = router
