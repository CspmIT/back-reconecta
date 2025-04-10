'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Element extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.belongsTo(models.MapLocation, { foreignKey: 'id_map', as: 'maps' })
			this.hasMany(models.Equipment, { foreignKey: 'id_element', as: 'equipments' })
			this.hasMany(models.Equipment, { foreignKey: 'id_element', as: 'binnacles' })
		}
	}
	Element.init(
		{
			name: DataTypes.STRING,
			description: DataTypes.STRING,
			type: DataTypes.INTEGER,
			power: DataTypes.STRING,
			id_map: DataTypes.INTEGER,
			lat: DataTypes.DECIMAL,
			lon: DataTypes.DECIMAL,
			status: DataTypes.BOOLEAN,
			id_user: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'Element',
		}
	)
	return Element
}
