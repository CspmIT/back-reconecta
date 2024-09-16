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
		}
	}
	Node_History.init(
		{
			id_node: DataTypes.BIGINT,
			id_device: DataTypes.BIGINT,
			type_device: DataTypes.TINYINT,
			status: DataTypes.TINYINT,
		},
		{
			sequelize,
			modelName: 'Node_History',
		}
	)
	return Node_History
}
