'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class UserChecksHome extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.belongsTo(models.User, { foreignKey: 'id_user', targetKey: 'id', as: 'user_check' })
		}
	}
	UserChecksHome.init(
		{
			check: DataTypes.INTEGER,
			type: DataTypes.INTEGER,
			id_map: DataTypes.INTEGER,
			id_user: DataTypes.INTEGER,
			status: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'UserChecksHome',
			tableName: 'UserChecksHome',
		}
	)
	return UserChecksHome
}
