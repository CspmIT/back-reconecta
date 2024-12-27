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

sequelize = new Sequelize(config.database, config.username, config.password, config)

fs.readdirSync(__dirname)
	.filter((file) => {
		return (
			file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js' && file.indexOf('.test.js') === -1
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

db.Sequelize = Sequelize
db.sequelize = sequelize

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
