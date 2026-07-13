'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class MeterTransformRatio extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.belongsTo(models.Equipment, { foreignKey: 'id_equipment', as: 'equipment' })
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'users' })
		}
	}
	MeterTransformRatio.init(
		{
			id_equipment: DataTypes.INTEGER,
			vt_primary: DataTypes.FLOAT,
			vt_secondary: DataTypes.FLOAT,
			ct_primary: DataTypes.FLOAT,
			ct_secondary: DataTypes.FLOAT,
			status: DataTypes.BOOLEAN,
			id_user: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'MeterTransformRatio',
		}
	)
	return MeterTransformRatio
}
