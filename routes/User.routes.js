const express = require('express')
const {
	saveConfigTable,
	getColumnsUserTable,
	getControlsRecloserUser,
	saveControlsRecloser,
} = require('../controllers/ConfigUser.controllers')
const { verifyToken } = require('../middleware/Auth.middleware')
const { getListUser, getListUserPass, addPassRecloser, getUserPass } = require('../controllers/User.controllers')
const router = express.Router()

router.post('/saveConfigTable', verifyToken, saveConfigTable)
router.post('/getColumnsTable', verifyToken, getColumnsUserTable)
router.post('/getControlsRecloserUser', verifyToken, getControlsRecloserUser)
router.post('/saveControlsRecloser', verifyToken, saveControlsRecloser)
router.get('/listUsers', verifyToken, getListUser)
router.get('/listUsersPass', verifyToken, getListUserPass)
router.get('/userPass', verifyToken, getUserPass)
router.post('/savePass', verifyToken, addPassRecloser)

module.exports = router
