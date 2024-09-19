const express = require('express')
const {
	saveConfigTable,
	getColumnsUserTable,
	getControlsRecloserUser,
	saveControlsRecloser,
} = require('../controllers/ConfigUser.controllers')
const { verifyToken } = require('../middleware/Auth.middleware')
const router = express.Router()

router.post('/saveConfigTable', verifyToken, saveConfigTable)
router.post('/getColumnsTable', verifyToken, getColumnsUserTable)
router.post('/getControlsRecloserUser', verifyToken, getControlsRecloserUser)
router.post('/saveControlsRecloser', verifyToken, saveControlsRecloser)

module.exports = router
