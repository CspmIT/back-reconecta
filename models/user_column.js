'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class User_Column extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.ColumnsTable, { foreignKey: 'id_columnsTable', targetKey: 'id', as: 'columnsTable' })
		}
	}
	User_Column.init(
		{
			status: DataTypes.BOOLEAN,
			id_columnsTable: DataTypes.BIGINT,
			id_user: DataTypes.BIGINT,
		},
		{
			sequelize,
			modelName: 'User_Column',
		}
	)
	return User_Column
}
