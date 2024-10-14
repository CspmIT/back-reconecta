'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class User extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.RecloserPassword, { foreignKey: 'id', targetKey: 'id_user', as: 'passwordRecloser' })
			this.hasMany(models.Menu_selected, { foreignKey: 'id', targetKey: 'id_user', as: 'Menu' })
		}
	}
	User.init(
		{
			first_name: DataTypes.STRING,
			last_name: DataTypes.STRING,
			email: DataTypes.STRING,
			profile: DataTypes.TINYINT,
			status: DataTypes.BOOLEAN,
			dark: DataTypes.BOOLEAN,
			token_app: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'User',
		}
	)
	return User
}
