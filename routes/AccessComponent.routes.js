const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const router = express.Router()
let isComponentInUse = false
let accessExpiration = null
const ACCESS_TIMEOUT = 1 * 60 * 1500

router.get('/check-access-Config', verifyToken, (req, res) => {
	if (isComponentInUse && isComponentInUse != req.user.id && Date.now() < accessExpiration) {
		return res.status(403).json({ message: 'El componente esta en uso' })
	}
	isComponentInUse = req.user.id
	accessExpiration = Date.now() + ACCESS_TIMEOUT
	res.status(200).json(true)
})

router.post('/renew-access-Config', verifyToken, (req, res) => {
	if (isComponentInUse && isComponentInUse == req.user.id) {
		accessExpiration = Date.now() + ACCESS_TIMEOUT
		res.status(200).json({ message: 'Acceso renovado' })
	} else {
		res.status(403).json({ message: 'AcceAccesoss no renovado' })
	}
})
router.post('/release-access-Config', verifyToken, (req, res) => {
	isComponentInUse = false
	accessExpiration = null
	res.status(200).json(true)
})

module.exports = router
