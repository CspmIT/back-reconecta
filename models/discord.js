'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Discord extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	Discord.init(
		{
			webhook: DataTypes.STRING,
			username: DataTypes.STRING,
			avatar: DataTypes.STRING,
			description: DataTypes.STRING,
			color: DataTypes.INTEGER,
			image: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'Discord',
		}
	)
	return Discord
}
