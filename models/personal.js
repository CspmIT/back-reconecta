'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class Personal extends Model {
		static associate(models) {
			Personal.belongsToMany(models.Binnacle, {
				through: models.Binnacle_personal,
				foreignKey: 'id_personal',
				otherKey: 'id_binnacle',
				as: 'binnacles',
			})
			Personal.hasMany(models.Binnacle_personal, {
				foreignKey: 'id_personal',
				as: 'binnacle_personal',
			})
		}
	}
	Personal.init(
		{
			first_name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			last_name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			rol: DataTypes.STRING,
		},
		{
			sequelize,
			modelName: 'Personal',
			tableName: 'Personal',
		}
	)
	return Personal
}
