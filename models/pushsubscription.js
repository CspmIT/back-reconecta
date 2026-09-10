'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class PushSubscription extends Model {
		static associate(models) {
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'user' })
			// El lado inverso se declara aca para no tocar el modelo User.
			models.User.hasMany(this, { foreignKey: 'id_user', as: 'pushSubscriptions' })
		}
	}
	PushSubscription.init(
		{
			id_user: DataTypes.INTEGER,
			endpoint: DataTypes.STRING,
			p256dh: DataTypes.STRING,
			auth: DataTypes.STRING,
			user_agent: DataTypes.STRING,
			last_success_at: DataTypes.DATE,
			last_error: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'PushSubscription',
		}
	)
	return PushSubscription
}
