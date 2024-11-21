const express = require('express')
const { verifyToken } = require('../middleware/Auth.middleware')
const {
	getVersions,
	addMeter,
	listMeter,
	metersEnabled,
	dataMeter,
	dataMetrologyBasic,
	dataMetrologyPower,
	dataMetrologyEnergy,
	dataMetrologyVI,
	dataCurva,
	dataVoltageCurrent,
	dataCosenoFi,
	dataInfoGraf,
} = require('../controllers/Meter.controller')
const router = express.Router()

router.get('/getVersionsMeter', verifyToken, getVersions)
router.get('/getListMeter', verifyToken, listMeter)
router.get('/getMetersEnabled', verifyToken, metersEnabled)
router.post('/addMeter', verifyToken, addMeter)
router.get('/getDataMeter', verifyToken, dataMeter)
// METROLOGIA INSTANTANEA
router.get('/getMetrologyVI', verifyToken, dataMetrologyVI)
router.get('/getMetrologyInsta', verifyToken, dataMetrologyBasic)
router.get('/getMetrologyPower', verifyToken, dataMetrologyPower)
router.get('/getMetrologyEnergy', verifyToken, dataMetrologyEnergy)
// CURVA DE CARGA
router.post('/getCurva', verifyToken, dataCurva)
router.post('/getVoltageCurrent', verifyToken, dataVoltageCurrent)
router.post('/getCosenoFi', verifyToken, dataCosenoFi)
router.post('/getInfoGraf', verifyToken, dataInfoGraf)

module.exports = router
