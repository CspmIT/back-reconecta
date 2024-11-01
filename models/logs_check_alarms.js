'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Logs_check_alarms extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'user' })
		}
	}
	Logs_check_alarms.init(
		{
			id_device: DataTypes.INTEGER,
			type: DataTypes.ENUM('Reconectador', 'Medidor', 'Analizador'),
			id_user: DataTypes.INTEGER,
			date_check: DataTypes.DATE,
		},
		{
			sequelize,
			modelName: 'Logs_check_alarms',
		}
	)
	return Logs_check_alarms
}
