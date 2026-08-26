'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Equipment extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			this.belongsTo(models.Element, { foreignKey: 'id_element', as: 'elements' })
			this.belongsTo(models.EquipmentModel, { foreignKey: 'id_model', as: 'equipmentmodels' })
			this.belongsTo(models.User, { foreignKey: 'id_user', as: 'users' })
		}
	}
	Equipment.init(
		{
			id_model: DataTypes.INTEGER,
			serial: DataTypes.STRING,
			configuration: DataTypes.INTEGER,
			observation: DataTypes.STRING,
			id_element: DataTypes.INTEGER,
			status: DataTypes.BOOLEAN,
			/*
			 * Equipo que representa al elemento cuando hay mas de uno del mismo
			 * tipo (el mapa muestra un solo estado y una sola medicion por
			 * elemento). Principal = true, el resto = NULL y NUNCA false: el
			 * indice unico (id_element, is_main) se apoya en que MySQL admite
			 * NULL repetido, no un 0 repetido.
			 */
			is_main: DataTypes.BOOLEAN,
			id_user: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'Equipment',
		}
	)
	return Equipment
}
