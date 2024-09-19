const express = require('express')
const { getListNode, saveNode, getNodexId } = require('../controllers/Node.controllers')
const { verifyToken } = require('../middleware/Auth.middleware')
const router = express.Router()

router.get('/getListNode', verifyToken, getListNode)
router.get('/getNodexId', verifyToken, getNodexId)
router.post('/saveNode', verifyToken, saveNode)

module.exports = router
