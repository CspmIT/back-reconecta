'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class RecloserPassword extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.User, { foreignKey: 'id_user_create', targetKey: 'id', as: 'user_create' })
			this.belongsTo(models.User, { foreignKey: 'id_user_edit', targetKey: 'id', as: 'user_edit' })
		}
	}
	RecloserPassword.init(
		{
			password: DataTypes.STRING,
			status: { type: DataTypes.BOOLEAN, defaultValue: 1 },
			id_user: DataTypes.BIGINT,
			id_user_create: DataTypes.INTEGER,
			id_user_edit: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'RecloserPassword',
		}
	)
	return RecloserPassword
}
