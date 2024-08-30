const express = require('express')
const { generateTable, generateColumns } = require('../controllers/Migrate.controllers')
const router = express.Router()

router.get('/migrateTables', generateTable)
router.get('/migrateColumns', generateColumns)

module.exports = router
