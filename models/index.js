'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')

const basename = path.basename(__filename)
const configs = require('../config/config.js')

// 🟢 CACHÉ opcional (mejora rendimiento pero no es obligatorio)
const tenants = {}

/**
 * Crea una instancia DB NUEVA por tenant
 */
const getTenantDb = async (tenantKey) => {
	if (!configs[tenantKey]) {
		throw new Error(`No existe configuración para el tenant: ${tenantKey}`)
	}

	//Si querés cachear para evitar crear miles de conexiones, descomentá:
	if (tenants[tenantKey]) return tenants[tenantKey]

	const config = configs[tenantKey]

	const sequelize = new Sequelize(config.database, config.username, config.password, config)

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

	tenants[tenantKey] = db
	return db
}

module.exports = { getTenantDb }
