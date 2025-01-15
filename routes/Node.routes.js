const express = require('express')
const {
	getListNode,
	saveNode,
	getNodexId,
	unlinkRelationNode,
	deleteNode,
	getMaps,
} = require('../controllers/Node.controller')
const { verifyToken } = require('../middleware/Auth.middleware')
const router = express.Router()

router.get('/getListNode', verifyToken, getListNode)
router.get('/getNodexId', verifyToken, getNodexId)
router.post('/saveNode', verifyToken, saveNode)
router.post('/unlinkRelationNode', verifyToken, unlinkRelationNode)
router.post('/deleteNode', verifyToken, deleteNode)

router.get('/getMaps', verifyToken, getMaps)

module.exports = router
