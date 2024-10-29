'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Task_Influx_Recloser extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Task_Influx_Recloser.init({
    id_task: DataTypes.STRING,
    id_recloser: DataTypes.BIGINT
  }, {
    sequelize,
    modelName: 'Task_Influx_Recloser',
  });
  return Task_Influx_Recloser;
};