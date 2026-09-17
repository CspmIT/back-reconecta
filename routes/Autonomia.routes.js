const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const { firmwares, binario, eventos, nuevoEvento } = require('../controllers/Autonomia.controller')
const router = express.Router()

// AutonomIA (aprovisionamiento Multivac) dentro de Reconecta.
router.get('/autonomia/firmwares', verifyToken, firmwares)
// La key del binario viaja por query: si alguna vez trae subcarpeta, el `%2F`
// del path lo decodifica nginx al normalizar la URI y la ruta dejaria de
// matchear. La forma /bin/:key queda como alias del README.
router.get('/autonomia/bin', verifyToken, binario)
router.get('/autonomia/bin/:key', verifyToken, binario)
router.get('/autonomia/eventos', verifyToken, eventos)
router.post('/autonomia/eventos', verifyToken, nuevoEvento)

module.exports = router
