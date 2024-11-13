const express = require('express')
const { generateTable, generateColumns } = require('../controllers/Migrate.controller')
const router = express.Router()
//AMBAS MIGRACIONES SE REALIZAN CON SEEDERS
// router.get('/migrateTables', generateTable)
// router.get('/migrateColumns', generateColumns)

module.exports = router
