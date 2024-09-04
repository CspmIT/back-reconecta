'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Control extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.Control, { foreignKey: 'id_version', as: 'version' })
			this.hasMany(models.Users_Control, { foreignKey: 'id_control', as: 'user' })
		}
	}
	Control.init(
		{
			title: DataTypes.STRING,
			field: DataTypes.STRING,
			level: DataTypes.TINYINT,
			status: DataTypes.BOOLEAN,
			type_input: DataTypes.STRING,
			id_version: DataTypes.BIGINT,
		},
		{
			sequelize,
			modelName: 'Control',
		}
	)
	return Control
}
