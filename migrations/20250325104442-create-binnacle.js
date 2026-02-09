'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Binnacle', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      id_element: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Elements',
          key: 'id',
        },
      },
      name_element: {
        type: Sequelize.STRING,
      },
      lat: {
        type: Sequelize.DECIMAL(17, 14),
      },
      lon: {
        type: Sequelize.DECIMAL(17, 14),
      },
      task: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      type_task: {
        allowNull: false,
        type: Sequelize.ENUM(
          'Media Tensión',

        ),
      },
      order: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      status: {
        allowNull: false,
        type: Sequelize.ENUM(
          'En Servicio',
          'Fuera de Servicio',
          'deleted'
        ),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
