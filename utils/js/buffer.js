// utils/js/influxBuffer.js
const buffer = {} // buffer en memoria
const requiredFields = ['events_0', 'events_1', 'info']

function addToBuffer(key, field, value) {
	if (!buffer[key]) buffer[key] = { valuesMap: {}, created_at: Date.now() / 1000 }
	buffer[key].valuesMap[field] = value
}

function getCompleteRecords() {
	const ready = []
	for (const key in buffer) {
		const fields = Object.keys(buffer[key].valuesMap)
		if (requiredFields.every((f) => fields.includes(f))) {
			const valuesArray = requiredFields.map((f) => ({ field: f, value: buffer[key].valuesMap[f] }))
			ready.push({ key, values: valuesArray })
			delete buffer[key]
		}
	}
	return ready
}

function cleanupOld(timeout = 5) {
	const now = Date.now() / 1000
	const old = []
	for (const key in buffer) {
		if (now - buffer[key].created_at > timeout) {
			const valuesArray = Object.keys(buffer[key].valuesMap).map((f) => ({
				field: f,
				value: buffer[key].valuesMap[f],
			}))
			old.push({ key, values: valuesArray })
			delete buffer[key]
		}
	}
	return old
}

module.exports = { addToBuffer, getCompleteRecords, cleanupOld }
