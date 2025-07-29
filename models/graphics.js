'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Graphics extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.hasMany(models.GraphicsVariables, { foreignKey: 'id_graphic', as: 'variables' })
		}
	}
	Graphics.init(
		{
			name: DataTypes.STRING,
			type: DataTypes.INTEGER,
			unit: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
		},
		{
			sequelize,
			modelName: 'Graphic',
		}
	)
	return Graphics
}
