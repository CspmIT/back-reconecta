const { getData, getDataAnalyzer } = require('../services/AnalyzerService')

const getAnalyzer = async (req, res) => {
	try {
		const analyzer = await getDataAnalyzer(req.body)
		const dataAnalyzer = {}
		let pot_activa = 0
		let pot_reactiva = 0
		let pot_aparente = 0
		analyzer.forEach((value, key) => {
			if (key.endsWith('_p')) {
				pot_activa += value[0].value
			}
			if (key.endsWith('_q')) {
				pot_reactiva += value[0].value
			}
			dataAnalyzer[key] = value[0].value
		})
		dataAnalyzer.f_0_ain = dataAnalyzer.f_0_ain || dataAnalyzer.ae_imp
		dataAnalyzer.f_1_ain = dataAnalyzer.f_1_ain || dataAnalyzer.re_imp
		dataAnalyzer.f_0_aout = dataAnalyzer.f_0_aout || dataAnalyzer.ae_exp
		dataAnalyzer.f_2_aout = dataAnalyzer.f_2_aout || dataAnalyzer.re_exp

		for (let i = 0; i <= 2; i++) {
			const f1 = `f_${i}_p`
			const f2 = `f_${i}_q`
			const field = `aparent_${i}`
			const cos = `cos_${i}`
			if (!dataAnalyzer[f1] || !dataAnalyzer[f2]) {
				dataAnalyzer[f1] = '-'
				dataAnalyzer[f2] = '-'
				dataAnalyzer[field] = '-'
				dataAnalyzer[cos] = '-'
				continue
			}
			const aparente = Math.sqrt(Math.pow(dataAnalyzer[f1], 2) + Math.pow(dataAnalyzer[f2], 2))
			dataAnalyzer[field] = Math.round(aparente, 1)
			if (!aparente || !dataAnalyzer[f1]) {
				dataAnalyzer[cos] = 'Error'
			} else {
				dataAnalyzer[cos] = (dataAnalyzer[f1] / aparente).toFixed(2)
			}
			dataAnalyzer[f2] = dataAnalyzer[f2] / 1000
			dataAnalyzer[f1] = dataAnalyzer[f1] / 1000
			dataAnalyzer[field] = dataAnalyzer[field] / 1000
			pot_aparente += dataAnalyzer[field]
		}
		dataAnalyzer.cos_total = (pot_activa / pot_aparente / 1000).toFixed(2)
		dataAnalyzer.pot_activa = (pot_activa / 1000).toFixed(3)
		dataAnalyzer.pot_reactiva = (pot_reactiva / 1000).toFixed(3)
		dataAnalyzer.pot_aparente = pot_aparente.toFixed(3)
		dataAnalyzer.ener_activa = (dataAnalyzer.f_0_ain - dataAnalyzer.f_0_aout).toFixed(2)
		dataAnalyzer.ener_reactiva = (dataAnalyzer.f_1_ain - dataAnalyzer.f_2_aout).toFixed(2)

		return res.status(200).json(dataAnalyzer)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	getAnalyzer,
}
