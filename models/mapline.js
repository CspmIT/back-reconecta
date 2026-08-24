'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class MapLine extends Model {
		static associate(models) {
			this.hasMany(models.MapLineVertex, { foreignKey: 'id_line', as: 'vertices' })
		}
	}
	MapLine.init(
		{
			name: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
		},
		{
			sequelize,
			modelName: 'MapLine',
		}
	)
	return MapLine
}
