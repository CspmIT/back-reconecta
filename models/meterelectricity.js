'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class MeterElectricity extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.hasMany(models.Node_History, { foreignKey: 'id_device', targetKey: 'id', as: 'history' })
			this.belongsTo(models.Version, { foreignKey: 'id_version', targetKey: 'id', as: 'version' })
			this.belongsTo(models.User, { foreignKey: 'id_user_create', targetKey: 'id', as: 'user_create' })
			this.belongsTo(models.User, { foreignKey: 'id_user_edit', targetKey: 'id', as: 'user_edit' })
			this.belongsTo(models.Node, { foreignKey: 'id_node', targetKey: 'id', as: 'node' })
		}
	}
	MeterElectricity.init(
		{
			serial: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
			id_version: DataTypes.INTEGER,
			id_user_create: DataTypes.INTEGER,
			id_user_edit: DataTypes.INTEGER,
			id_node: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'MeterElectricity',
		}
	)
	return MeterElectricity
}
