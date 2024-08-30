'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class RecloserPassword extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	RecloserPassword.init(
		{
			password: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
			id_user: DataTypes.BIGINT,
		},
		{
			sequelize,
			modelName: 'RecloserPassword',
		}
	)
	return RecloserPassword
}
