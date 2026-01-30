'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Menu extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate() {
			// define association here
		}
	}
	Menu.init(
		{
			name: DataTypes.STRING,
			link: DataTypes.STRING,
			icon: DataTypes.STRING,
			level: DataTypes.TINYINT,
			group_menu: DataTypes.TINYINT,
			sub_menu: DataTypes.INTEGER,
			status: DataTypes.BOOLEAN,
			order: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'Menu',
		}
	)
	return Menu
}
