const express = require('express')
const { getListNode, saveNode, getNodexId } = require('../controllers/Node.controllers')
const router = express.Router()

router.get('/getListNode', getListNode)
router.get('/getNodexId', getNodexId)
router.post('/saveNode', saveNode)

module.exports = router
