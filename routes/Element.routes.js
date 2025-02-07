const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { listElements, addElement, listModels } = require('../controllers/Element.controller')
const router = express.Router()

router.get('/Elements', verifyToken, listElements)
router.post('/Elements', verifyToken, addElement)
router.get('/ElementsModel', verifyToken, listModels)

module.exports = router
