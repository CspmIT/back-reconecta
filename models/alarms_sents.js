'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Alarms_sents extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	Alarms_sents.init(
		{
			id_device: DataTypes.INTEGER,
			type: DataTypes.ENUM('Recloser', 'Medidor', 'Analizador'),
			id_event: DataTypes.INTEGER,
			status: DataTypes.BOOLEAN,
		},
		{
			sequelize,
			modelName: 'Alarms_sents',
		}
	)
	return Alarms_sents
}
