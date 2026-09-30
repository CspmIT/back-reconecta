'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class ActionLog extends Model {
		static associate(models) {
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'user' })
		}
	}
	ActionLog.init(
		{
			id_user: DataTypes.INTEGER,
			action: DataTypes.ENUM('LOGIN', 'MQTT_SEND', 'API_TOKEN_CREATE', 'API_TOKEN_REVOKE'),
			details: DataTypes.JSON,
		},
		{
			sequelize,
			modelName: 'ActionLog',
			// Solo se registra el momento del hecho: un log no se actualiza.
			updatedAt: false,
		}
	)
	return ActionLog
}
