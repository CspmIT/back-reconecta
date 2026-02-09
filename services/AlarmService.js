const saveAlarm = async (db, data) => {
	await db.Logs_Alarm.create(data)
}

const discordCredentials = async (db) => {
	const credentials = await db.Discord.findOne({ where: { id: 1 } })
	return credentials
}

module.exports = {
	saveAlarm,
	discordCredentials,
}
