const {
	getIdTable,
	getIdColumn,
	saveColumnUser,
	getColumnsUser,
	getControlsRecloser,
	saveCrontrolsUser,
	getControlsUserConfig,
} = require('../services/ConfigUserService')
const jwt = require('jsonwebtoken')
require('dotenv')
const secret = process.env.SECRET

const saveConfigTable = async (req, res) => {
	try {
		const { table, columns } = req.body
		if (!table || !columns) throw new Error('se deben pasar todo los campos (id_table y un array de las columnas)')
		const idTable = await getIdTable(table)
		const token = req.cookies.token
		const decoded = jwt.verify(token, secret)
		const arrayColumns = []
		for (const item of Object.keys(columns)) {
			const column = await getIdColumn(idTable.id, item)
			arrayColumns.push({ name: item, status: columns[item], id_user: decoded.sub, id_columnsTable: column.id })
		}

		await saveColumnUser(arrayColumns)
		return res.status(200).json(arrayColumns)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

const getColumnsUserTable = async (req, res) => {
	try {
		const { table_name, id_user } = req.body
		const idTable = await getIdTable(table_name)
		const column = await getColumnsUser(idTable.id, id_user)
		const result = column.map((item) => {
			return { name: item.columnsTable.name, status: item.status }
		})
		return res.status(200).json(result)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}

const getControlsRecloserUser = async (req, res) => {
	try {
		const { user, version } = req.body
		const controlsUser = await getControlsUserConfig(user, version)
		let result = []
		if (controlsUser.length) {
			result = controlsUser
				.map((item) => {
					return {
						...item.control.dataValues,
						level: item.level,
						ubication: item.ubication,
					}
				})
				.sort((a, b) => a.level - b.level)
				.sort((a, b) => a.ubication - b.ubication)
		} else {
			result = await getControlsRecloser(version)
		}
		return res.status(200).json(result)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
const saveControlsRecloser = async (req, res) => {
	try {
		const { controls } = req.body
		if (!controls) throw new Error('se deben pasar los controls')
		const result = await saveCrontrolsUser(controls)
		return res.status(200).json(result)
	} catch (error) {
		if (error.errors) {
			res.status(500).json(error.errors)
		} else {
			res.status(400).json(error.message)
		}
	}
}
module.exports = {
	saveConfigTable,
	getColumnsUserTable,
	getControlsRecloserUser,
	saveControlsRecloser,
}
