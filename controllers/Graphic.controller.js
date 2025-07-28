const saveGraphic = async (req, res) => {
	try {
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = {
	saveGraphic,
}
