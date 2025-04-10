const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { listBinnacle,
    addBinnacle,
    deleteBinnacle,
    updateBinnacle,
} = require('../controllers/Binnacle.controller')
const router = express.Router()

router.get('/Binnacle', verifyToken, listBinnacle)
router.get('/Binnacle/:id', verifyToken, listBinnacle)
router.post('/Binnacle', verifyToken, addBinnacle)
router.patch('/binnacle/:id/update', verifyToken, updateBinnacle)
router.patch('/binnacle/:id/delete', deleteBinnacle)

module.exports = router