'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Recloser extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.Version, { foreignKey: 'id_version', targetKey: 'id', as: 'version' })
		}
	}
	Recloser.init(
		{
			name: DataTypes.STRING,
			serial: DataTypes.STRING,
			lat_location: DataTypes.DECIMAL,
			lng_location: DataTypes.DECIMAL,
			status: DataTypes.BOOLEAN,
			status_recloser: DataTypes.INTEGER,
			num_recloser: DataTypes.STRING,
			id_version: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'Recloser',
		}
	)
	return Recloser
}
