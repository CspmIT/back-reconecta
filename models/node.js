'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Node extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			this.hasMany(models.Node_History, { foreignKey: 'id_node', as: 'node_history' })
		}
	}
	Node.init(
		{
			name: DataTypes.STRING,
			number: DataTypes.STRING,
			type: DataTypes.INTEGER,
			description: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			status: DataTypes.BOOLEAN,
			lat_location: DataTypes.DECIMAL,
			lng_location: DataTypes.DECIMAL,
		},
		{
			sequelize,
			modelName: 'Node',
		}
	)
	return Node
}
