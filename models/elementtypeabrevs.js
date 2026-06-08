'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class ElementTypeAbrev extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.belongsTo(models.ElementType, { foreignKey: 'id_type', as: 'type' })
		}
	}
	ElementTypeAbrev.init(
		{
			id_type: DataTypes.INTEGER,
			abrev: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'ElementTypeAbrev',
		}
	)
	return ElementTypeAbrev
}
