'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Version extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.Brand, { foreignKey: 'id_brand', targetKey: 'id', as: 'brand' })
			this.hasMany(models.Control, { foreignKey: 'id_version', as: 'controls' })
		}
	}
	Version.init(
		{
			name: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
			id_brand: DataTypes.INTEGER,
			type_device: DataTypes.ENUM('Reconectador', 'Medidor', 'Analizador'),
		},
		{
			sequelize,
			modelName: 'Version',
		}
	)
	return Version
}
