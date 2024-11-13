'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Recloser extends Model {
		static associate(models) {
			// define association here
			this.belongsTo(models.Version, { foreignKey: 'id_version', targetKey: 'id', as: 'version' })
			this.hasMany(models.Node_History, { foreignKey: 'id_device', targetKey: 'id', as: 'history' })
			this.belongsTo(models.User, { foreignKey: 'id_user_create', targetKey: 'id', as: 'user_create' })
			this.belongsTo(models.User, { foreignKey: 'id_user_edit', targetKey: 'id', as: 'user_edit' })
		}
	}
	Recloser.init(
		{
			serial: DataTypes.STRING,
			status: DataTypes.BOOLEAN,
			status_recloser: DataTypes.INTEGER,
			status_alarm: DataTypes.BOOLEAN,
			config: DataTypes.TINYINT,
			id_node: DataTypes.INTEGER,
			id_version: DataTypes.INTEGER,
			id_user_create: DataTypes.INTEGER,
			id_user_edit: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'Recloser',
		}
	)
	return Recloser
}
