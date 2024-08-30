'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class ColumnsTable extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	ColumnsTable.init(
		{
			name: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
			id_table: DataTypes.BIGINT,
		},
		{
			sequelize,
			modelName: 'ColumnsTable',
		}
	)
	return ColumnsTable
}
