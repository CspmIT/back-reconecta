'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Users_Control extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.Control, { foreignKey: 'id_control', as: 'control' })
		}
	}
	Users_Control.init(
		{
			level: DataTypes.INTEGER,
			ubication: DataTypes.INTEGER,
			id_user: DataTypes.BIGINT,
			id_control: DataTypes.BIGINT,
		},
		{
			sequelize,
			modelName: 'Users_Control',
		}
	)
	return Users_Control
}
