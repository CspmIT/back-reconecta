'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const process = require('process')
const basename = path.basename(__filename)
const env = process.env.DATABASE || 'reconecta'
const config = require(__dirname + '/../config/config.js')[env]
const configDesarrollo = require(__dirname + '/../config/config.js')['coopm_v1']
const db = {}
const dbDesarrollo = {}
let sequelize
let sequelizeDesarrollo = new Sequelize(
	configDesarrollo.database,
	configDesarrollo.username,
	configDesarrollo.password,
	configDesarrollo
)
if (config.use_env_variable) {
	sequelize = new Sequelize(process.env[config.use_env_variable], config)
} else {
	sequelize = new Sequelize(config.database, config.username, config.password, config)
}

fs.readdirSync(__dirname)
	.filter((file) => {
		return (
			file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js' && file.indexOf('.test.js') === -1
		)
	})
	.forEach((file) => {
		const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes)
		const model2 = require(path.join(__dirname, file))(sequelizeDesarrollo, Sequelize.DataTypes)
		db[model.name] = model
		dbDesarrollo[model2.name] = model2
	})

Object.keys(db).forEach((modelName) => {
	if (db[modelName].associate) {
		db[modelName].associate(db)
	}
})
Object.keys(dbDesarrollo).forEach((modelName) => {
	if (dbDesarrollo[modelName].associate) {
		dbDesarrollo[modelName].associate(dbDesarrollo)
	}
})

db.Sequelize = Sequelize
db.sequelize = sequelize
dbDesarrollo.Sequelize = Sequelize
dbDesarrollo.sequelize = sequelizeDesarrollo

const changeSchema = async (schemaName) => {
	const sequelize = new Sequelize(schemaName, config.username, config.password, config)
	fs.readdirSync(__dirname)
		.filter((file) => {
			return (
				file.indexOf('.') !== 0 &&
				file !== basename &&
				file.slice(-3) === '.js' &&
				file.indexOf('.test.js') === -1
			)
		})
		.forEach((file) => {
			const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes)
			db[model.name] = model
		})

	Object.keys(db).forEach((modelName) => {
		if (db[modelName].associate) {
			db[modelName].associate(db)
		}
	})
	db.sequelize = sequelize
	db.Sequelize = Sequelize
}

module.exports = { db, dbDesarrollo, changeSchema }
