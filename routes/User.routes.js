const express = require('express')
const {
	saveConfigTable,
	getColumnsUserTable,
	getControlsRecloserUser,
	saveControlsRecloser,
} = require('../controllers/ConfigUser.controller')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	getListUser,
	getListUserPass,
	addPassRecloser,
	getUserPass,
	getAllMenu,
	abmMenu,
	deleteMenu,
	getPermission,
	savePermission,
	getProfiles,
} = require('../controllers/User.controller')
const router = express.Router()

router.post('/saveConfigTable', verifyToken, saveConfigTable)
router.post('/getColumnsTable', verifyToken, getColumnsUserTable)
router.post('/getControlsRecloserUser', verifyToken, getControlsRecloserUser)
router.post('/saveControlsRecloser', verifyToken, saveControlsRecloser)
router.get('/listUsers', verifyToken, getListUser)
router.get('/listUsersPass', verifyToken, getListUserPass)
router.get('/listProfiles', verifyToken, getProfiles)
router.get('/userPass', verifyToken, getUserPass)
router.post('/savePass', verifyToken, addPassRecloser)

router.get('/getAllMenu', verifyToken, getAllMenu)
router.post('/saveMenu', verifyToken, abmMenu)
router.post('/deleteMenu', verifyToken, deleteMenu)

router.get('/getPermission', verifyToken, getPermission)
router.post('/savePermission', verifyToken, savePermission)

module.exports = router
