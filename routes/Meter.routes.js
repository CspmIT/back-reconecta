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
	dataSurge,
	dataUnderVoltage,
	dataSurgeSummary,
	dataUnderVoltageSummary,
	dataCourt,
	dataCourtSummary,
	dataInterruption,
	dataInterruptionSummary,
	dataEobSummary,
	dataEobInvoice,
	dataEobEnergyTotal,
	meterTxRatio,
	saveMeterTxRatio,
} = require('../controllers/Meter.controller')
const router = express.Router()

router.get('/getVersionsMeter', verifyToken, getVersions)
router.get('/getListMeter', verifyToken, listMeter)
router.get('/getMetersEnabled', verifyToken, metersEnabled)
router.post('/addMeter', verifyToken, addMeter)
router.get('/getDataMeter', verifyToken, dataMeter)
// RELACION DE TRANSFORMACION (override manual CT/VT)
router.get('/getMeterTxRatio', verifyToken, meterTxRatio)
router.post('/saveMeterTxRatio', verifyToken, saveMeterTxRatio)
// METROLOGIA INSTANTANEA
router.get('/getMetrologyVI', verifyToken, dataMetrologyVI)
router.get('/getMetrologyInsta', verifyToken, dataMetrologyBasic)
router.get('/getMetrologyPower', verifyToken, dataMetrologyPower)
router.get('/getMetrologyEnergy', verifyToken, dataMetrologyEnergy)
// CURVA DE CARGA
router.post('/getCurva', verifyToken, dataCurva)

// CALIDAD DE TENSION
router.post('/getQualitySurge', verifyToken, dataSurge)
router.post('/getQualitySurgeSummary', verifyToken, dataSurgeSummary)
router.post('/getQualityUnderVoltage', verifyToken, dataUnderVoltage)
router.post('/getQualityUnderVoltageSummary', verifyToken, dataUnderVoltageSummary)
router.post('/getQualityCourt', verifyToken, dataCourt)
router.post('/getQualityCourtSummary', verifyToken, dataCourtSummary)
router.post('/getQualityInterruption', verifyToken, dataInterruption)
router.post('/getQualityInterruptionSummary', verifyToken, dataInterruptionSummary)

// ENERGIA (EOB) - un endpoint por seccion de la pestaña
router.post('/getEobSummary', verifyToken, dataEobSummary)
router.post('/getEobInvoice', verifyToken, dataEobInvoice)
router.post('/getEobEnergyTotal', verifyToken, dataEobEnergyTotal)

module.exports = router
