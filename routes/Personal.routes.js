const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { listPersonal, addPersonal } = require('../controllers/Personal.controller')
const router = express.Router()

router.get('/Personal', verifyToken, listPersonal)
router.post('/Personal', verifyToken, addPersonal)

module.exports = router
