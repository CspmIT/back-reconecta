'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Logs_Alarm extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	Logs_Alarm.init(
		{
			id_device: DataTypes.INTEGER,
			type: DataTypes.ENUM('Reconectador', 'Medidor', 'Analizador'),
			id_event: DataTypes.INTEGER,
			errors: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'Logs_Alarm',
		}
	)
	return Logs_Alarm
}
