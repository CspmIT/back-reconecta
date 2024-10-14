'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Menu_selected extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.Menu, { foreignKey: 'id_menu', as: 'Menus' })
			this.belongsTo(models.Profile, { foreignKey: 'id_profile', as: 'profils' })
			// this.belongsTo(models.User, { foreignKey: 'id_user', as: 'users' })
		}
	}
	Menu_selected.init(
		{
			id_menu: DataTypes.INTEGER,
			id_profile: DataTypes.INTEGER,
			id_user: DataTypes.INTEGER,
			status: DataTypes.BOOLEAN,
		},
		{
			sequelize,
			modelName: 'Menu_selected',
		}
	)
	return Menu_selected
}
