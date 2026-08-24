'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
	class MapLineVertex extends Model {
		static associate(models) {
			this.belongsTo(models.MapLine, { foreignKey: 'id_line', as: 'line' })
			this.belongsTo(models.Element, { foreignKey: 'id_element', as: 'element' })
		}
	}
	MapLineVertex.init(
		{
			id_line: DataTypes.INTEGER,
			seq: DataTypes.INTEGER,
			id_element: DataTypes.INTEGER,
			lat: DataTypes.DECIMAL(11, 6),
			lon: DataTypes.DECIMAL(11, 6),
		},
		{
			sequelize,
			modelName: 'MapLineVertex',
			// Explicito: la pluralizacion automatica de "Vertex" no es confiable
			tableName: 'MapLineVertices',
			validate: {
				// Un vertice esta anclado a un elemento O tiene coordenada propia.
				// Nunca las dos cosas: si esta anclado, la coordenada se resuelve
				// del Element y no se duplica (una sola fuente de verdad).
				ancladoOCoordenada() {
					const anclado = this.id_element !== null && this.id_element !== undefined
					const conCoords =
						this.lat !== null && this.lat !== undefined && this.lon !== null && this.lon !== undefined
					if (anclado && conCoords) {
						throw new Error('Un vertice anclado a un elemento no debe guardar lat/lon propias')
					}
					if (!anclado && !conCoords) {
						throw new Error('Un vertice libre necesita lat y lon')
					}
				},
			},
		}
	)
	return MapLineVertex
}
