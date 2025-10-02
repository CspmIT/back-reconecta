const express = require('express')
const {
	saveConfigTable,
	getColumnsUserTable,
	getControlsRecloserUser,
	saveControlsRecloser,
	getControlsRecloserNewData,
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
	getChecksHome,
	updateChecksHome,
	getUser,
} = require('../controllers/User.controller')
const router = express.Router()

router.post('/saveConfigTable', verifyToken, saveConfigTable)
router.post('/getColumnsTable', verifyToken, getColumnsUserTable)
//router.post('/getControlsRecloserUser', verifyToken, getControlsRecloserUser)
router.post('/getControlsRecloserUser', verifyToken, getControlsRecloserNewData)
router.get('/getControlsTest', verifyToken, getControlsRecloserNewData)
router.post('/saveControlsRecloser', verifyToken, saveControlsRecloser)
router.get('/listUsers', verifyToken, getListUser)
router.get('/listUsersPass', verifyToken, getListUserPass)
router.get('/listProfiles', verifyToken, getProfiles)
router.get('/userPass', verifyToken, getUserPass)
router.post('/savePass', verifyToken, addPassRecloser)
router.get('/getUser/:id', verifyToken, getUser)

router.get('/getAllMenu', verifyToken, getAllMenu)
router.post('/saveMenu', verifyToken, abmMenu)
router.post('/deleteMenu', verifyToken, deleteMenu)

router.get('/getPermission', verifyToken, getPermission)
router.post('/savePermission', verifyToken, savePermission)

router.get('/UserChecksHome', verifyToken, getChecksHome)
router.get('/UserChecksHome/:type', verifyToken, getChecksHome)
router.post('/UserChecksHome', verifyToken, updateChecksHome)
router.get('/UserChecksMap', verifyToken, getChecksHome)
router.post('/UserChecksMap', verifyToken, updateChecksHome)

module.exports = router
