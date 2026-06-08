'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class ElementType extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.hasMany(models.ElementTypeAbrev, { foreignKey: 'id_type', as: 'abrevs' })
		}
	}
	ElementType.init(
		{
			name: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
		},
		{
			sequelize,
			modelName: 'ElementType',
		}
	)
	return ElementType
}
