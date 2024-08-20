'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class RecloserDesarrollo extends Model {
		static associate(models) {
			// define association here
		}
	}
	RecloserDesarrollo.init(
		{
			name: DataTypes.INTEGER,
			serial: DataTypes.STRING,
			type_recloser: DataTypes.INTEGER,
			lat_location: DataTypes.DECIMAL,
			lng_location: DataTypes.DECIMAL,
			status: DataTypes.INTEGER,
			date_create: DataTypes.DATE,
			status_recloser: DataTypes.INTEGER,
			status_alarm_recloser: DataTypes.INTEGER,
			num_recloser: DataTypes.STRING,
		},
		{
			sequelize,
			tableName: 'recloser',
			timestamps: false,
			modelName: 'RecloserDesarrollo',
		}
	)
	return RecloserDesarrollo
}
