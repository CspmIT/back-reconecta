const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { converterAvailable, convertDwg, withSymbols } = require('../services/unifilar/convertDwg')
const { storageAvailable, uploadFile, downloadFile, deleteFile } = require('../services/StorageService')

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

// Deja el .dwg original disponible como archivo local, que es lo único que sabe
// leer LibreDWG. Los planos nuevos viven en MinIO y hay que bajarlos a un
// temporal; los viejos (subidos antes de MinIO) todavía tienen su ruta local.
// El `cleanup` solo borra lo que esta función creó.
const resolveDwg = async (plan) => {
	if (plan.dwg_key) {
		const buffer = await downloadFile(plan.dwg_key)
		const tmpPath = path.join(os.tmpdir(), `unifilar-${plan.id}-${process.pid}.dwg`)
		fs.writeFileSync(tmpPath, buffer)
		return { path: tmpPath, cleanup: () => fs.rmSync(tmpPath, { force: true }) }
	}
	if (plan.dwg_path && fs.existsSync(plan.dwg_path)) {
		return { path: plan.dwg_path, cleanup: () => {} }
	}
	throw new Error('El archivo .dwg original ya no está disponible')
}

const uploadPlan = async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ message: 'Falta el archivo .dwg' })
	}
	// multer deja el archivo en disco como paso intermedio: se sube a MinIO y el
	// temporal se borra. Solo sobrevive si no hay almacenamiento configurado.
	const tmpPath = req.file.path
	let dwgKey = null
	try {
		// Primero el guardado y después la conversión: si el conversor falla, el
		// plano queda pendiente pero el archivo ya está a salvo para reprocesar.
		if (storageAvailable()) {
			dwgKey = await uploadFile(fs.readFileSync(tmpPath))
		} else {
			console.warn('[unifilar] MINIO_ACCESS/MINIO_SECRET sin configurar: el .dwg queda en disco local')
		}
		const { svg, document, data } = await processDwg(tmpPath)
		const plan = await req.db.UnifilarPlan.create({
			name: req.body.name || req.file.originalname.replace(/\.dwg$/i, ''),
			file_name: req.file.originalname,
			dwg_path: dwgKey ? null : tmpPath,
			dwg_key: dwgKey,
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
		// El objeto ya subido no le sirve a nadie si el plano no llegó a crearse.
		if (dwgKey) await deleteFile(dwgKey).catch(() => {})
		return res.status(500).json({ message: e.message })
	} finally {
		if (dwgKey) fs.rmSync(tmpPath, { force: true })
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

// Descarga del .dwg original con su nombre real. El archivo ya no está en el
// disco del servidor, así que esta es la única forma de recuperarlo.
const getPlanDwg = async (req, res) => {
	let cleanup = () => {}
	try {
		const plan = await req.db.UnifilarPlan.findByPk(req.params.id)
		if (!plan || !plan.status) {
			return res.status(404).json({ message: 'Plano no encontrado' })
		}
		const dwg = await resolveDwg(plan)
		cleanup = dwg.cleanup
		res.setHeader('Content-Type', 'application/octet-stream')
		res.setHeader('Content-Disposition', `attachment; filename="${plan.file_name}"`)
		return res.sendFile(dwg.path, () => cleanup())
	} catch (e) {
		cleanup()
		return res.status(500).json({ message: e.message })
	}
}

// Reintenta la conversión de un plano pendiente (p. ej. cuando se instala
// el conversor después de subir el archivo).
const reprocessPlan = async (req, res) => {
	let cleanup = () => {}
	try {
		const plan = await req.db.UnifilarPlan.findByPk(req.params.id)
		if (!plan || !plan.status) {
			return res.status(404).json({ message: 'Plano no encontrado' })
		}
		const dwg = await resolveDwg(plan)
		cleanup = dwg.cleanup
		const { svg, document, data } = await processDwg(dwg.path)
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
	} finally {
		cleanup()
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

// Baja lógica: el .dwg de MinIO se conserva a propósito, porque el plano se
// puede volver a activar cambiándole el status.
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

module.exports = {
	uploadPlan,
	getPlans,
	getPlan,
	getPlanDwg,
	getPlanLive,
	reprocessPlan,
	updatePlan,
	deletePlan,
}
