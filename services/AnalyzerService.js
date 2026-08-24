const { ConsultaInflux } = require('./InfluxServices')

const getDataAnalyzer = async (data, influxName) => {
	const elements = ['acc', 'accio', 'inst', 'onoff']
	const dataReturn = new Map()

	await Promise.all(
		elements.map(async (elem) => {
			const query = `|> range(start: -30m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Analizador/${data.brand}/${data.version}/${data.serial}/${elem}")
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`

			const dataInflux = await ConsultaInflux(query, influxName)
			if (!dataInflux || dataInflux.length === 0) return null

			dataInflux.forEach((element) => {
				if (!dataReturn.has(element._field)) {
					dataReturn.set(element._field, [])
				}
				dataReturn.get(element._field).push({
					field: element._field,
					value: element._value,
					time: element._time,
				})
			})
		})
	)

	return dataReturn
}

const getHistoryAnalyzer = async (data, influxName) => {
	let dateCurrent = data.dateEnd ? new Date(data.dateEnd) : new Date()
	let dateStart
	if (data.dateStart) {
		dateStart = new Date(data.dateStart)
	} else {
		dateStart = new Date(dateCurrent)
		dateStart.setHours(dateCurrent.getHours() - 12)
	}
	const elements = ['acc', 'accio', 'inst', 'onoff']
	const dataReturn = new Map()
	const desc = data?.desc ? data.desc : 'true'
	await Promise.all(
		elements.map(async (elem) => {
			const query = `|> range(start: ${dateStart.toISOString()}, stop: ${dateCurrent.toISOString()})
		|> filter(fn: (r) => r["topic"] == "coop/energia/Analizador/${data.brand}/${data.version}/${data.serial}/${elem}")
		|> aggregateWindow(every: 5m, fn: last, createEmpty: false)
        |> sort(columns: ["_time"], desc: ${desc})`

			const dataInflux = await ConsultaInflux(query, influxName)
			if (!dataInflux || dataInflux.length === 0) return null

			dataInflux.forEach((element) => {
				if (!dataReturn.has(element._time)) {
					dataReturn.set(element._time, [])
				}
				dataReturn.get(element._time).push({
					field: element._field,
					value: element._value,
					time: element._time,
				})
			})
		})
	)

	return dataReturn
}

const getYearAnalyzer = async (data, influxName) => {
	const dataReturn = new Map()
	const elements = ['acc', 'accio', 'inst', 'onoff']
	await Promise.all(
		elements.map(async (elem) => {
			const query = `|> range(start: -12mo, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Analizador/${data.brand}/${data.version}/${data.serial}/${elem}")
		|> filter(fn: (r) => r["_field"] == "ae_imp" or r["_field"] == "ae_exp")
        |> aggregateWindow(every: 1mo, fn: last, createEmpty: false)`

			const dataInflux = await ConsultaInflux(query, influxName)
			if (!dataInflux || dataInflux.length === 0) return null

			dataInflux.forEach((element) => {
				if (!dataReturn.has(element._time)) {
					dataReturn.set(element._time, [])
				}
				dataReturn.get(element._time).push({
					field: element._field,
					value: element._value,
					time: element._time,
				})
			})
		})
	)

	return dataReturn
}

module.exports = {
	getDataAnalyzer,
	getHistoryAnalyzer,
	getYearAnalyzer,
}
