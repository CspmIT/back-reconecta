'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class SubstationRuralPat extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.belongsTo(models.Element, { foreignKey: 'id_element', as: 'elements' })
		}
	}
	SubstationRuralPat.init(
		{
			value: DataTypes.DECIMAL,
			id_element: DataTypes.INTEGER,
			status: DataTypes.BOOLEAN,
			id_user: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'SubstationRuralPat',
		}
	)
	return SubstationRuralPat
}
