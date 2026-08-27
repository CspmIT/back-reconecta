const fs = require('node:fs')
const { converterAvailable, convertDwg, withSymbols } = require('../services/unifilar/convertDwg')

// Convierte el DWG y devuelve { svg, document, data }. Si el conversor no
// está disponible o falla, deja el plano pendiente con el error registrado.
const processDwg = async (dwgPath) => {
	if (!converterAvailable()) {
		return {
			svg: null,
			document: null,
			data: { pending: true, error: 'Conversor LibreDWG no configurado (LIBREDWG_PATH)' },
		}
	}
	try {
		const { svg, document, summary } = await convertDwg(dwgPath)
		return { svg, document, data: { pending: false, summary } }
	} catch (e) {
		return { svg: null, document: null, data: { pending: true, error: e.message } }
	}
}

const uploadPlan = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: 'Falta el archivo .dwg' })
		}
		const { svg, document, data } = await processDwg(req.file.path)
		const plan = await req.db.UnifilarPlan.create({
			name: req.body.name || req.file.originalname.replace(/\.dwg$/i, ''),
			file_name: req.file.originalname,
			dwg_path: req.file.path,
			svg,
			document,
			data,
			status: 1,
		})
		return res.status(200).json({
			message: data.pending ? 'Plano guardado, conversión pendiente' : 'Plano procesado correctamente',
			data: { id: plan.id, name: plan.name, pending: data.pending },
		})
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const getPlans = async (req, res) => {
	try {
		const data = await req.db.UnifilarPlan.findAll({
			attributes: ['id', 'name', 'file_name', 'data', 'status', 'createdAt'],
			where: { status: 1 },
			order: [['id', 'DESC']],
		})
		return res.status(200).json(data)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const getPlan = async (req, res) => {
	try {
		const plan = await req.db.UnifilarPlan.findByPk(req.params.id)
		if (!plan || !plan.status) {
			return res.status(404).json({ message: 'Plano no encontrado' })
		}
		return res.status(200).json(plan)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

// Reintenta la conversión de un plano pendiente (p. ej. cuando se instala
// el conversor después de subir el archivo).
const reprocessPlan = async (req, res) => {
	try {
		const plan = await req.db.UnifilarPlan.findByPk(req.params.id)
		if (!plan || !plan.status) {
			return res.status(404).json({ message: 'Plano no encontrado' })
		}
		if (!fs.existsSync(plan.dwg_path)) {
			return res.status(500).json({ message: 'El archivo .dwg original ya no existe en el servidor' })
		}
		const { svg, document, data } = await processDwg(plan.dwg_path)
		// El mapeo entidad→equipo se conserva: los ids son los handles del DWG,
		// así que siguen siendo válidos tras reconvertir el mismo archivo.
		await plan.update({
			svg,
			document,
			data: {
				...data,
				...(plan.data?.mapping ? { mapping: plan.data.mapping } : {}),
				...(plan.data?.shapeTypes ? { shapeTypes: plan.data.shapeTypes } : {}),
			},
		})
		return res.status(200).json({
			message: data.pending ? 'La conversión sigue pendiente' : 'Plano procesado correctamente',
			data: { id: plan.id, pending: data.pending, error: data.error || null },
		})
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

// Snapshot de datos en vivo de todos los equipos vinculados del plano
const getPlanLive = async (req, res) => {
	try {
		const plan = await req.db.UnifilarPlan.findByPk(req.params.id)
		if (!plan || !plan.status) {
			return res.status(404).json({ message: 'Plano no encontrado' })
		}
		const { getLiveData } = require('../services/unifilar/liveData')
		const data = await getLiveData(req.db, plan.data?.mapping, req.user.influx_name)
		return res.status(200).json(data)
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

// Guarda las ediciones del frontend: documento (fuente de verdad) + el SVG
// serializado por el editor (derivados), y/o el mapeo entidad→equipo que vive
// en data.mapping ({ [entityId]: { kind, label, deviceType, deviceId } }), y/o
// la tipificación de formas en data.shapeTypes ({ [shapeKey]: kind }).
const updatePlan = async (req, res) => {
	try {
		const plan = await req.db.UnifilarPlan.findByPk(req.params.id)
		if (!plan || !plan.status) {
			return res.status(404).json({ message: 'Plano no encontrado' })
		}
		const { document, svg, name, mapping, shapeTypes } = req.body
		if (document && !Array.isArray(document.entities)) {
			return res.status(400).json({ message: 'Documento inválido' })
		}
		if (!document && !mapping && !name && !shapeTypes) {
			return res.status(400).json({ message: 'Nada para actualizar' })
		}
		const patch = { ...(plan.data || {}) }
		if (mapping) patch.mapping = mapping
		if (shapeTypes) patch.shapeTypes = shapeTypes
		await plan.update({
			// Los símbolos se derivan de la geometría: si el documento cambió hay
			// que redetectarlos, y las claves de forma son estables así que la
			// tipificación que ya hizo el usuario sigue valiendo.
			...(document ? { document: withSymbols(document) } : {}),
			...(typeof svg === 'string' && svg.startsWith('<svg') ? { svg } : {}),
			...(name ? { name } : {}),
			...(mapping || shapeTypes ? { data: patch } : {}),
		})
		return res.status(200).json({ message: 'Plano actualizado', data: { id: plan.id } })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

const deletePlan = async (req, res) => {
	try {
		const plan = await req.db.UnifilarPlan.findByPk(req.params.id)
		if (!plan) {
			return res.status(404).json({ message: 'Plano no encontrado' })
		}
		await plan.update({ status: 0 })
		return res.status(200).json({ message: 'Plano eliminado' })
	} catch (e) {
		return res.status(500).json({ message: e.message })
	}
}

module.exports = { uploadPlan, getPlans, getPlan, getPlanLive, reprocessPlan, updatePlan, deletePlan }
