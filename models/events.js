'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Event extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	Event.init(
		{
			id_event_influx: DataTypes.INTEGER,
			name: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
			priority: DataTypes.TINYINT,
			alarm: DataTypes.BOOLEAN,
			flash_screen: DataTypes.BOOLEAN,
			customizable: DataTypes.BOOLEAN,
			id_version: DataTypes.INTEGER,
			type_device: DataTypes.ENUM('Reconectador', 'Medidor', 'Analizador'),
			type_var: DataTypes.ENUM('Event', 'Output', 'Log'),
			description: DataTypes.STRING,
			id_database: DataTypes.STRING,
			index_file: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'Event',
		}
	)
	return Event
}
