const axios = require('axios')
const { baseUrl, bucket: defaultBucket, accessKey, secretKey } = require('../config/minio.conf')

// Cliente del gateway de archivos (storageov). Expone las tres operaciones que
// necesita el backend sobre un objeto de MinIO: subir, bajar y borrar.
//
// El gateway nombra los objetos él mismo (`<uuid>.<ext>`, con la extensión
// derivada del mime que se le manda) y devuelve ese nombre en `fileName`. Ese
// string es la única referencia al archivo: es lo que hay que guardar en la
// base, no una ruta.
//
// Los .dwg viajan como `application/octet-stream`, que es el mime que el
// gateway admite para binarios (guarda el objeto como `.bin`). El nombre real
// del archivo se conserva aparte, en la columna `file_name` del plano.
const DWG_MIME = 'application/octet-stream'

// Sin llaves configuradas no se puede hablar con el gateway. Quien llame decide
// si eso es un error o si tiene un plan B (unifilar guarda en disco local).
const storageAvailable = () => Boolean(accessKey && secretKey)

const authHeaders = () => {
	if (!storageAvailable()) {
		throw new Error('Almacenamiento no configurado (MINIO_ACCESS / MINIO_SECRET)')
	}
	return { accesskey: accessKey, secretkey: secretKey }
}

// Un archivo de 50 MB tarda lo suyo en cruzar hasta el gateway y de ahí a
// MinIO; el default de axios (sin timeout) dejaría el request colgado para
// siempre si el gateway no responde.
const TIMEOUT = 2 * 60 * 1000

// El nombre viaja en la URL de getImg/deleteImg: los nombres que genera el
// gateway son planos (uuid + extensión), así que cualquier barra o `..` es
// señal de un valor manipulado y no de un objeto real.
const assertSafeName = (fileName) => {
	if (!fileName || fileName.includes('/') || fileName.includes('..')) {
		throw new Error('Nombre de archivo inválido')
	}
}

// Sube un buffer y devuelve el nombre del objeto en MinIO.
const uploadFile = async (buffer, { bucket = defaultBucket, mimetype = DWG_MIME } = {}) => {
	const form = new FormData()
	form.append('bucketName', bucket)
	// El gateway lee el archivo del campo `image` (la ruta /uploadImg es la que
	// acepta binarios; /uploadFile solo admite ofimática).
	form.append('image', new Blob([buffer], { type: mimetype }), 'upload')
	const { data } = await axios.post(`${baseUrl}/minio/uploadImg`, form, {
		headers: authHeaders(),
		timeout: TIMEOUT,
		maxBodyLength: Infinity,
		maxContentLength: Infinity,
	})
	if (!data?.fileName) {
		throw new Error(data?.message || 'El gateway no devolvió el nombre del archivo')
	}
	return data.fileName
}

// Baja un objeto como Buffer.
const downloadFile = async (fileName, { bucket = defaultBucket } = {}) => {
	assertSafeName(fileName)
	const { data } = await axios.get(
		`${baseUrl}/minio/getImg/${bucket}/${encodeURIComponent(fileName)}`,
		{ headers: authHeaders(), timeout: TIMEOUT, responseType: 'arraybuffer' }
	)
	return Buffer.from(data)
}

// Borra un objeto. Idempotente: el gateway responde 200 con removed:false si
// el archivo ya no estaba.
const deleteFile = async (fileName, { bucket = defaultBucket } = {}) => {
	assertSafeName(fileName)
	const { data } = await axios.delete(
		`${baseUrl}/minio/deleteImg/${bucket}/${encodeURIComponent(fileName)}`,
		{ headers: authHeaders(), timeout: TIMEOUT }
	)
	return Boolean(data?.removed)
}

module.exports = { storageAvailable, uploadFile, downloadFile, deleteFile, DWG_MIME }
