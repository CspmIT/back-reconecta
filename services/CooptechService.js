const { db, changeSchema } = require('../models')

const addUserCooptech = async (data) => {
	await changeSchema(data.schema_name)
	return db.sequelize.transaction(async (t) => {
		try {
			const dataUser = {
				first_name: data.name,
				last_name: data.last_name,
				email: data.email,
				profile: data.profile,
				status: data.status,
				token_app: data.token,
				dark: 0,
			}
			const [User, createdUser] = await db.User.findOrCreate({ where: { email: dataUser.email }, defaults: { ...dataUser }, transaction: t })
			if (!createdUser) {
				const dataUpdate = {
					first_name: data.name,
					last_name: data.last_name,
					email: data.email,
					profile: data.profile,
					status: data.status,
					token_app: data.token,
				}
				await User.update(dataUpdate, { transaction: t })
			}
			return User
		} catch (error) {
			throw error
		}
	})
}

module.exports = {
	addUserCooptech,
}
