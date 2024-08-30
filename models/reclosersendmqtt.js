'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class RecloserSendMqtt extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	RecloserSendMqtt.init(
		{
			serial: DataTypes.STRING,
			type: DataTypes.INTEGER,
			action: DataTypes.STRING,
			date_send: DataTypes.DATE,
			status: DataTypes.BOOLEAN,
			message: DataTypes.STRING,
			id_user: DataTypes.BIGINT,
		},
		{
			sequelize,
			modelName: 'RecloserSendMqtt',
		}
	)
	return RecloserSendMqtt
}
