const { SCOPES, MAX_EXPIRES_DAYS, listTokens, createToken, revokeToken } = require('../services/ApiTokenService')
const { ACTIONS, logAction, requestInfo } = require('../services/ActionLogService')

const listApiTokens = async (req, res) => {
	try {
		return res.status(200).json(await listTokens(req.db))
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

// Permisos disponibles, para que el front arme el formulario de alta
const listApiScopes = (req, res) => {
	return res.status(200).json({
		scopes: Object.entries(SCOPES).map(([value, label]) => ({ value, label })),
		max_expires_days: MAX_EXPIRES_DAYS,
	})
}

const addApiToken = async (req, res) => {
	try {
		const { name, scopes, expires_in_days } = req.body
		const result = await createToken(req.db, { name, scopes, expires_in_days, user: req.user })
		await logAction(req.db, {
			id_user: req.user.id,
			action: ACTIONS.API_TOKEN_CREATE,
			details: { id_token: result.data.id, name: result.data.name, scopes: result.data.scopes, ...requestInfo(req) },
		})
		// `token` es la unica vez que viaja el secreto completo
		return res.status(201).json(result)
	} catch (e) {
		return res.status(400).json({ message: e.message })
	}
}

const deleteApiToken = async (req, res) => {
	try {
		const id = Number(req.params.id)
		if (!Number.isInteger(id)) return res.status(400).json({ message: 'id invalido' })
		const token = await revokeToken(req.db, id)
		if (!token) return res.status(404).json({ message: 'Token no encontrado' })
		await logAction(req.db, {
			id_user: req.user.id,
			action: ACTIONS.API_TOKEN_REVOKE,
			details: { id_token: token.id, name: token.name, ...requestInfo(req) },
		})
		return res.status(200).json(token)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = { listApiTokens, listApiScopes, addApiToken, deleteApiToken }
