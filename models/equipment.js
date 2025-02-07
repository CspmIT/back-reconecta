'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Equipment extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.belongsTo(models.Element, { foreignKey: 'id_element', as: 'elements' })
			this.belongsTo(models.EquipmentModel, { foreignKey: 'id_model', as: 'equipmentmodels' })
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'users' })
		}
	}
	Equipment.init(
		{
			id_model: DataTypes.INTEGER,
			serial: DataTypes.STRING,
			configuration: DataTypes.INTEGER,
			observation: DataTypes.STRING,
			id_element: DataTypes.INTEGER,
			status: DataTypes.BOOLEAN,
			id_user: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'Equipment',
		}
	)
	return Equipment
}
