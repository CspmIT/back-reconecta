'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Node_History extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.belongsTo(models.Node, { foreignKey: 'id_node', as: 'nodes' })
			this.belongsTo(models.User, { foreignKey: 'id_user_create', targetKey: 'id', as: 'user_create' })
			this.belongsTo(models.User, { foreignKey: 'id_user_edit', targetKey: 'id', as: 'user_edit' })
		}
	}
	Node_History.init(
		{
			id_node: DataTypes.BIGINT,
			id_device: DataTypes.BIGINT,
			type_device: DataTypes.TINYINT,
			status: DataTypes.TINYINT,
			id_user_create: DataTypes.INTEGER,
			id_user_edit: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'Node_History',
		}
	)
	return Node_History
}
