'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class UserPref extends Model {
		static associate(models) {
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'user' })
		}
	}
	UserPref.init(
		{
			id_user: DataTypes.INTEGER,
			module: DataTypes.STRING,
			payload: DataTypes.JSON,
		},
		{
			sequelize,
			modelName: 'UserPref',
		}
	)
	return UserPref
}
