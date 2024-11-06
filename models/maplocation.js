'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class MapLocation extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	MapLocation.init(
		{
			zoom: DataTypes.FLOAT,
			status: DataTypes.BOOLEAN,
			lat_location: DataTypes.DECIMAL,
			lng_location: DataTypes.DECIMAL,
			name: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'MapLocation',
		}
	)
	return MapLocation
}
