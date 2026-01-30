const { getDataAnalyzer, getHistoryAnalyzer, getYearAnalyzer } = require('../services/AnalyzerService')
const { convertIsoToDate } = require('../utils/js/dateConvert')

const getMetrology = async (req, res) => {
	try {
		const { influx_name } = req.user
		const analyzer = await getDataAnalyzer(req.body, influx_name)
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
			if (!dataAnalyzer.time) {
				dataAnalyzer.time = value[0].time
			}
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

const getHistory = async (req, res) => {
	try {
		const { influx_name } = req.user
		const analyzer = await getHistoryAnalyzer(req.body, influx_name)
		const dataAnalyzer = []
		const fieldsMap = {
			f_0_v: 'tr',
			f_1_v: 'ts',
			f_2_v: 'tt',
			f_0_i: 'cr',
			f_1_i: 'cs',
			f_2_i: 'ct',
			f_0_p: 'p0',
			f_1_p: 'p1',
			f_2_p: 'p2',
			f_0_q: 'q0',
			f_1_q: 'q1',
			f_2_q: 'q2',
			f_0_a: 'a0',
			f_1_a: 'a1',
			f_2_a: 'a2',
			f_0_r: 'r0',
			f_1_r: 'r1',
			f_2_r: 'r2',
		}
		let i = 0
		analyzer.forEach((value) => {
			if (!dataAnalyzer[i]) {
				dataAnalyzer[i] = {}
			}
			value.map((item) => {
				if (!dataAnalyzer[i].time) {
					dataAnalyzer[i].date = item.time
				}
				if (fieldsMap[item.field]) {
					dataAnalyzer[i][fieldsMap[item.field]] = item.value
				}
			})
			i++
		})
		dataAnalyzer.forEach((item, index) => {
			let ptotal = 0
			//let qtotal = 0
			let atotal = 0
			for (let j = 0; j <= 2; j++) {
				if (!item[`p${j}`] || !item[`q${j}`]) {
					item[`p${j}`] = '-'
					item[`q${j}`] = '-'
					item[`a${j}`] = '-'
					continue
				}
				const aparente = Math.sqrt(Math.pow(item[`p${j}`], 2) + Math.pow(item[`q${j}`], 2))
				dataAnalyzer[index][`aparente_${j}`] = Math.round(aparente, 1) / 1000
				const cos = !aparente || !item[`p${j}`] ? null : (item[`p${j}`] / aparente).toFixed(2)
				dataAnalyzer[index][`cos_${j}`] = cos
				dataAnalyzer[index][`p${j}`] = item[`p${j}`] / 1000
				dataAnalyzer[index][`q${j}`] = item[`q${j}`] / 1000
				ptotal += item[`p${j}`]
				//qtotal += item[`q${j}`]
				atotal += dataAnalyzer[index][`aparente_${j}`]
				if (j === 2) {
					dataAnalyzer[index].cos_total = (ptotal / atotal).toFixed(2)
					dataAnalyzer[index].aparente_total = parseFloat(atotal.toFixed(3))
				}
			}
		})
		return res.status(200).json(dataAnalyzer)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const getGraphics = async (req, res) => {
	try {
		const { influx_name } = req.user
		const analyzer = await getHistoryAnalyzer(req.body, influx_name)
		const tension = await formatData(analyzer, 'v')
		const corriente = await formatData(analyzer, 'i')
		const activa = await formatData(analyzer, 'p')
		const reactiva = await formatData(analyzer, 'q')
		const graphicData = [
			{
				tension,
				corriente,
				activa,
				reactiva,
			},
		]
		return res.status(200).json(graphicData)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const formatData = async (data, field) => {
	const dataReturn = {
		R: { name: 'Fase R', values: [] },
		S: { name: 'Fase S', values: [] },
		T: { name: 'Fase T', values: [] },
		time: [],
	}
	data.forEach(async (value) => {
		value.map(async (item) => {
			if (item.field === `f_0_${field}`) {
				dataReturn.R.values.push(item.value)
				const time = await convertIsoToDate(item.time)
				dataReturn.time.push(time)
			}
			if (item.field === `f_1_${field}`) {
				dataReturn.S.values.push(item.value)
			}
			if (item.field === `f_2_${field}`) {
				dataReturn.T.values.push(item.value)
			}
		})
	})
	return dataReturn
}

const getMonthData = async (req, res) => {
	try {
		const { influx_name } = req.user
		const data = await getYearAnalyzer(req.body, influx_name)
		const months = [
			'Enero',
			'Febrero',
			'Marzo',
			'Abril',
			'Mayo',
			'Junio',
			'Julio',
			'Agosto',
			'Septiembre',
			'Octubre',
			'Noviembre',
			'Diciembre',
		]
		const dataReturn = new Map()
		let i = 0
		data.forEach((value, key) => {
			const month = new Date(key).getMonth()
			const expValue = value.find((item) => item.field === 'ae_exp')
			const impValue = value.find((item) => item.field === 'ae_imp')
			const total = expValue.value < 0 ? impValue.value - 0 : impValue.value - expValue.value
			const neta = i === 0 ? total : total - dataReturn.get(i - 1).total
			if (!dataReturn.has(i)) {
				dataReturn.set(i, { name: months[month], total: total.toFixed(2), value: neta.toFixed(2) })
			}
			i++
		})
		dataReturn.get(0).name = dataReturn.get(0).name + ' (acumulado)'
		dataReturn.get(i - 1).name = dataReturn.get(i - 1).name + ' (en curso)'
		dataReturn.delete(0)

		return res.status(200).json(Object.fromEntries(dataReturn))
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	getMetrology,
	getHistory,
	getGraphics,
	getMonthData,
}
