'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class UnifilarPlan extends Model {
		static associate() {}
	}
	UnifilarPlan.init(
		{
			name: DataTypes.STRING,
			file_name: DataTypes.STRING,
			dwg_path: DataTypes.STRING,
			svg: DataTypes.TEXT('long'),
			data: DataTypes.JSON,
			document: DataTypes.JSON,
			status: DataTypes.BOOLEAN,
		},
		{
			sequelize,
			modelName: 'UnifilarPlan',
		}
	)
	return UnifilarPlan
}
