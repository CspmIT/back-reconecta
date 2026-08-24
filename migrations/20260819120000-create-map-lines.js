'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('MapLines', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			name: {
				// Nombre del tramo/alimentador, editable desde el mapa
				type: Sequelize.STRING,
				allowNull: false,
			},
			status: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: 1,
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

		await queryInterface.createTable('MapLineVertices', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			id_line: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: 'MapLines', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			seq: {
				// Orden del vertice dentro del trazo, base 0
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			id_element: {
				// Vertice anclado a un elemento de la red. RESTRICT a proposito:
				// borrar un elemento con tramos colgando debe fallar y avisar,
				// no romper la red en silencio.
				type: Sequelize.INTEGER,
				allowNull: true,
				references: { model: 'Elements', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
			},
			lat: {
				// Solo se usa cuando el vertice es libre (id_element IS NULL).
				// Si esta anclado, la coordenada se resuelve del Element.
				type: Sequelize.DECIMAL(11, 6),
				allowNull: true,
			},
			lon: {
				type: Sequelize.DECIMAL(11, 6),
				allowNull: true,
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

		await queryInterface.addIndex('MapLineVertices', ['id_line', 'seq'], {
			unique: true,
			name: 'map_line_vertices_line_seq',
		})
		await queryInterface.addIndex('MapLineVertices', ['id_element'], {
			name: 'map_line_vertices_element',
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('MapLineVertices')
		await queryInterface.dropTable('MapLines')
	},
}
