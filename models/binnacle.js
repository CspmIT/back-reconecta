'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class Binnacle extends Model {
		static associate(models) {
			Binnacle.belongsTo(models.Element, { foreignKey: 'id_element', as: 'element' })
			Binnacle.belongsTo(models.Equipment, { foreignKey: 'id_equipment', as: 'equipment' })
			Binnacle.hasMany(models.Binnacle_pictures, { foreignKey: 'id_binnacle', as: 'pictures' })
			Binnacle.hasMany(models.Binnacle_personal, {
				foreignKey: 'id_binnacle',
				as: 'binnacle_personal',
			})
			Binnacle.belongsToMany(models.Personal, {
				through: models.Binnacle_personal,
				foreignKey: 'id_binnacle',
				otherKey: 'id_personal',
				as: 'personal',
			})
		}
	}
	Binnacle.init(
		{
			id_element: DataTypes.INTEGER,
			id_equipment: DataTypes.INTEGER,
			name_element: DataTypes.STRING,
			order: {
				type: DataTypes.STRING,
			},
			type_task: {
				type: DataTypes.INTEGER,
				allowNull: false,
				comment:
					'1) Mantenimiento preventivo - 2) Mantenimiento correctivo - 3) Inspección - 4) Instalación / Puesta en servicio - 5) Cambio / Reemplazo de equipo - 6) Reparación - 7) Media Tensión - 8) Baja Tensión - 9) Transformador - 10) Medidor - 11) Otro',
			},
			date_task: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			status_task: {
				type: DataTypes.ENUM('Programada', 'En curso', 'Completada', 'Cancelada', 'Vencida'),
				allowNull: false,
			},
			day_task: DataTypes.INTEGER,
			hours_task: DataTypes.INTEGER,
			minutes_task: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			description: {
				type: DataTypes.STRING,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: 'Binnacle',
			tableName: 'Binnacle',
		}
	)
	return Binnacle
}
