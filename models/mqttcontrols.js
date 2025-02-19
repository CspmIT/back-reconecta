'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class MqttControl extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.hasMany(models.MqttControl, { foreignKey: 'id_control', as: 'controls' })
		}
	}
	MqttControl.init(
		{
			title: DataTypes.STRING,
			field: DataTypes.STRING,
			level: DataTypes.TINYINT,
			status: DataTypes.BOOLEAN,
			type_input: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'MqttControl',
		}
	)
	return MqttControl
}
