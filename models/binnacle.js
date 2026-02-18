'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
    class Binnacle extends Model {
        static associate(models) {
            Binnacle.belongsTo(models.Element, { foreignKey: 'id_element', as: 'element' });
        }
    }
    Binnacle.init(
        {
            id_element: DataTypes.INTEGER,
            name_element: DataTypes.STRING,
            lat: DataTypes.DECIMAL,
            lon: DataTypes.DECIMAL,
            task: DataTypes.STRING,
            type_task: DataTypes.ENUM('Media Tensión'),
            order: DataTypes.INTEGER,
            status: DataTypes.ENUM('En Servicio', 'Fuera de Servicio', 'deleted'),
        },
        {
            sequelize,
            modelName: 'Binnacle',
            tableName: 'Binnacle',
        }
    )
    return Binnacle
}