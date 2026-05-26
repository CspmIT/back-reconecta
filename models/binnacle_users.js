'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Binnacle_users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Binnacle_users.belongsTo(models.Binnacle, { foreignKey: 'id_binnacle', as: 'binnacle' });
      Binnacle_users.belongsTo(models.User, { foreignKey: 'id_user', as: 'user' });
    }
  }
  Binnacle_users.init({
    id_binnacle: DataTypes.INTEGER,
    id_user: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Binnacle_users',
  });
  return Binnacle_users;
};