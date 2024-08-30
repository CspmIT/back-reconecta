const express = require('express')
const { saveConfigTable, getColumnsUserTable } = require('../controllers/ConfigUser.controllers')
const router = express.Router()

router.post('/saveConfigTable', saveConfigTable)
router.post('/getColumnsTable', getColumnsUserTable)

module.exports = router
