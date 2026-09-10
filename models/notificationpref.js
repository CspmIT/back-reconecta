'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class NotificationPref extends Model {
		static associate(models) {
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'user' })
			// El lado inverso se declara aca para no tocar el modelo User.
			models.User.hasOne(this, { foreignKey: 'id_user', as: 'notificationPref' })
		}
	}
	NotificationPref.init(
		{
			id_user: DataTypes.INTEGER,
			enabled: DataTypes.BOOLEAN,
			timezone: DataTypes.STRING,
			quiet_enabled: DataTypes.BOOLEAN,
			quiet_start: DataTypes.TIME,
			quiet_end: DataTypes.TIME,
			quiet_days: DataTypes.JSON,
			quiet_allow_critical: DataTypes.BOOLEAN,
			muted_alarm_types: DataTypes.JSON,
			muted_device_types: DataTypes.JSON,
			muted_events: DataTypes.JSON,
			muted_devices: DataTypes.JSON,
			min_priority: DataTypes.TINYINT,
		},
		{
			sequelize,
			modelName: 'NotificationPref',
		}
	)
	return NotificationPref
}
