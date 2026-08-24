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
			this.belongsTo(models.Equipment, { foreignKey: 'id_device', as: 'equipment' })
			this.belongsTo(models.Event, { foreignKey: 'id_event', as: 'event' })
		}
	}
	Logs_Alarm.init(
		{
			id_device: DataTypes.INTEGER,
			type_alarm: DataTypes.ENUM('Evento', 'Deadman'),
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
