const { db } = require('../models')
const getDateCheck = async (id, typeDevice) => {
	const dataResult = await db.Logs_check_alarms.findOne({ where: [{ type: typeDevice }, { id_device: id }], order: [['createdAt', 'DESC']], })
	return dataResult
}
const addLogsChecks = async (logs) => {
	const dataResult = await db.Logs_check_alarms.bulkCreate(logs)
	return dataResult
}
module.exports = {
	getDateCheck,
	addLogsChecks,
}
