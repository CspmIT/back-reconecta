'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')

const basename = path.basename(__filename)
const env = process.env.DATABASE || 'reconecta'
const baseConfig = require('../config/config.js')[env]

// 🟢 CACHÉ opcional (mejora rendimiento pero no es obligatorio)
const tenants = {}

/**
 * Crea una instancia DB NUEVA por tenant
 */
const getTenantDb = async (tenantKey = null) => {
	const key = tenantKey || 'default'

	// Si ya existe, lo devolvemos
	if (tenants[key]) return tenants[key]

	// Clonar configuración para NO afectar global config
	const tenantConfig = {
		...baseConfig,
		database: tenantKey || process.env.DB_NAME,
	}

	// Nueva instancia Sequelize
	const sequelize = new Sequelize(tenantConfig.database, tenantConfig.username, tenantConfig.password, tenantConfig)

	const db = {}

	fs.readdirSync(__dirname)
		.filter(
			(file) => file.indexOf('.') !== 0 && file !== basename && file.endsWith('.js') && !file.endsWith('.test.js')
		)
		.forEach((file) => {
			const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes)
			db[model.name] = model
		})

	Object.values(db)
		.filter((m) => m.associate)
		.forEach((m) => m.associate(db))

	db.sequelize = sequelize
	db.Sequelize = Sequelize

	tenants[key] = db
	return db
}

module.exports = { getTenantDb }
