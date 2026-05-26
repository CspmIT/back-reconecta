const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	listBinnacle,
	addBinnacle,
	deleteBinnacle,
	updateBinnacle,
} = require('../controllers/Binnacle.controller')
const router = express.Router()

router.get('/Binnacle/Ordenes', verifyToken, listBinnacle)
router.get('/Binnacle/Ordenes/:id', verifyToken, listBinnacle)
router.post('/Binnacle/Ordenes', verifyToken, addBinnacle)
router.patch('/Binnacle/Ordenes/:id', verifyToken, updateBinnacle)
router.delete('/Binnacle/Ordenes/:id', verifyToken, deleteBinnacle)

module.exports = router
