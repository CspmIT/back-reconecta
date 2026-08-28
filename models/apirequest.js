'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class ApiRequest extends Model {
		static associate(models) {
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'user' })
		}
	}
	ApiRequest.init(
		{
			id_user: DataTypes.INTEGER,
			method: DataTypes.STRING,
			path: DataTypes.STRING,
			module: DataTypes.STRING,
			status: DataTypes.SMALLINT,
			ms: DataTypes.INTEGER,
			error_message: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'ApiRequest',
			// Un request es un hecho puntual: no se actualiza.
			updatedAt: false,
		}
	)
	return ApiRequest
}
