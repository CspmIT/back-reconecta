const { Op } = require('sequelize')
const { db } = require('../models')

const saveAlarm = async (data) => {
	try {
		await db.Logs_Alarm.create(data)
	} catch (e) {
		throw e
	}
}

module.exports = {
	saveAlarm,
}
