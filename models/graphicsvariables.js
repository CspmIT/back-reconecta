'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class GraphicsVariables extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.belongsTo(models.Graphic, { foreignKey: 'id_graphic', as: 'graphics' })
			this.belongsTo(models.Equipment, { foreignKey: 'id_equipment', as: 'equipment' })
		}
	}
	GraphicsVariables.init(
		{
			name: DataTypes.STRING,
			value: DataTypes.FLOAT,
			id_equipment: DataTypes.INTEGER,
			id_graphic: DataTypes.INTEGER,
			order: DataTypes.INTEGER,
			color: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'GraphicsVariables',
		}
	)
	return GraphicsVariables
}
