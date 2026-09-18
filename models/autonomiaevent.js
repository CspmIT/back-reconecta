'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class AutonomiaEvent extends Model {
		static associate(models) {
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'user' })
		}
	}
	AutonomiaEvent.init(
		{
			id_user: DataTypes.INTEGER,
			// flash | config
			tipo: DataTypes.STRING(10),
			// flash: actualizar | fabrica — config: reconecta | itron
			modo: DataTypes.STRING(20),
			modelo: DataTypes.STRING(80),
			version: DataTypes.STRING(40),
			chip: DataTypes.STRING(40),
			// MAC de fábrica del ESP32: identifica la placa física.
			mac: DataTypes.STRING(32),
			nombre_equipo: DataTypes.STRING(80),
			// ok | error | abortado
			resultado: DataTypes.STRING(10),
			detalle: DataTypes.STRING(500),
		},
		{
			sequelize,
			modelName: 'AutonomiaEvent',
		}
	)
	return AutonomiaEvent
}
