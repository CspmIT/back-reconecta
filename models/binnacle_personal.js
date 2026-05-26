'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class Binnacle_personal extends Model {
		static associate(models) {
			Binnacle_personal.belongsTo(models.Binnacle, {
				foreignKey: 'id_binnacle',
				as: 'binnacle',
			})
			Binnacle_personal.belongsTo(models.Personal, {
				foreignKey: 'id_personal',
				as: 'personal',
			})
		}
	}
	Binnacle_personal.init(
		{
			id_binnacle: DataTypes.INTEGER,
			id_personal: DataTypes.INTEGER,
		},
		{
			sequelize,
			modelName: 'Binnacle_personal',
		}
	)
	return Binnacle_personal
}
