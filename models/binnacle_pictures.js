'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Binnacle_pictures extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Binnacle_pictures.belongsTo(models.Binnacle, { foreignKey: 'id_binnacle', as: 'binnacle' });
    }
  }
  Binnacle_pictures.init({
    id_binnacle: DataTypes.INTEGER,
    name_file: DataTypes.STRING,
    type: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Binnacle_pictures',
  });
  return Binnacle_pictures;
};