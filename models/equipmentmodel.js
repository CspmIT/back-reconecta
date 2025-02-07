'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class EquipmentModel extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.hasMany(models.Equipment, { foreignKey: 'id_model', as: 'equipments' })
		}
	}
	EquipmentModel.init(
		{
			name: DataTypes.STRING,
			brand: DataTypes.STRING,
			description: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
		},
		{
			sequelize,
			modelName: 'EquipmentModel',
		}
	)
	return EquipmentModel
}
