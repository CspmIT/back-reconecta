'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class ControlModel extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.EquipmentModel, { foreignKey: 'id_model', as: 'model' })
			this.belongsTo(models.MqttControl, { foreignKey: 'id_control', as: 'control' })
		}
	}
	ControlModel.init(
		{
			id_model: DataTypes.INTEGER,
			id_control: DataTypes.INTEGER,
			status: DataTypes.BOOLEAN,
		},
		{
			sequelize,
			modelName: 'ControlsModel',
		}
	)
	return ControlModel
}
