const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { listApiTokens, listApiScopes, addApiToken, deleteApiToken } = require('../controllers/ApiToken.controller')
const router = express.Router()

// Administracion de los tokens de la API externa, desde la app
router.get('/apiTokens', verifyToken, listApiTokens)
router.get('/apiTokens/scopes', verifyToken, listApiScopes)
router.post('/apiTokens', verifyToken, addApiToken)
router.delete('/apiTokens/:id', verifyToken, deleteApiToken)

module.exports = router
