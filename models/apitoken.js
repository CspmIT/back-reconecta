'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class ApiToken extends Model {
		static associate(models) {
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'user' })
		}
	}
	ApiToken.init(
		{
			name: DataTypes.STRING,
			token_prefix: DataTypes.STRING,
			token_hash: DataTypes.STRING,
			influx_name: DataTypes.STRING,
			scopes: DataTypes.JSON,
			expires_at: DataTypes.DATE,
			last_used_at: DataTypes.DATE,
			last_ip: DataTypes.STRING,
			revoked_at: DataTypes.DATE,
			id_user: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'ApiToken',
		}
	)
	return ApiToken
}
