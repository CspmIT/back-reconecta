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
			this.hasMany(models.SubstationRuralClient, { foreignKey: 'id_element', as: 'clients' })
			this.hasMany(models.SubstationRuralPat, { foreignKey: 'id_element', as: 'pat' })
			this.hasMany(models.MapLineVertex, { foreignKey: 'id_element', as: 'lineVertices' })
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
			feed: DataTypes.INTEGER,
			image: DataTypes.STRING,
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
