const express = require('express')
const multer = require('multer')
const path = require('node:path')
const fs = require('node:fs')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	uploadPlan,
	getPlans,
	getPlan,
	getPlanLive,
	reprocessPlan,
	updatePlan,
	deletePlan,
} = require('../controllers/Unifilar.controller')

const router = express.Router()

const uploadDir = path.join(__dirname, '..', 'uploads', 'unifilar')
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		fs.mkdirSync(uploadDir, { recursive: true })
		cb(null, uploadDir)
	},
	filename: (req, file, cb) => {
		const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
		cb(null, `${Date.now()}-${safeName}`)
	},
})
const upload = multer({
	storage,
	limits: { fileSize: 50 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (!file.originalname.toLowerCase().endsWith('.dwg')) {
			return cb(new Error('Solo se aceptan archivos .dwg'))
		}
		cb(null, true)
	},
})

router.post('/unifilarPlan', verifyToken, upload.single('file'), uploadPlan)
router.get('/unifilarPlans', verifyToken, getPlans)
router.get('/unifilarPlan/:id', verifyToken, getPlan)
router.get('/unifilarPlan/:id/live', verifyToken, getPlanLive)
router.post('/unifilarPlan/:id/process', verifyToken, reprocessPlan)
router.put('/unifilarPlan/:id', verifyToken, updatePlan)
router.delete('/unifilarPlan/:id', verifyToken, deletePlan)

module.exports = router
