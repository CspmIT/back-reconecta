'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Brand extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.hasMany(models.Version, { foreignKey: 'id_brand', as: 'version' })
		}
	}
	Brand.init(
		{
			name: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
			type_device: DataTypes.ENUM('Reconectador', 'Medidor', 'Analizador'),
		},
		{
			sequelize,
			modelName: 'Brand',
		}
	)
	return Brand
}
