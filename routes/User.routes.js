const express = require('express')
const { saveConfigTable, getColumnsUserTable, getControlsRecloserUser, saveControlsRecloser } = require('../controllers/ConfigUser.controllers')
const router = express.Router()

router.post('/saveConfigTable', saveConfigTable)
router.post('/getColumnsTable', getColumnsUserTable)
router.post('/getControlsRecloserUser', getControlsRecloserUser)
router.post('/saveControlsRecloser', saveControlsRecloser)

module.exports = router
