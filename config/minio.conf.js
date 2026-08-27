// Conexión al gateway de archivos (storageov → MinIO).
//
// El backend NO habla con MinIO directamente: pasa por el mismo gateway que ya
// usa el frontend para las fotos de bitácora y subestaciones rurales
// (SistemaArchivos), así las credenciales de MinIO viven en un solo lugar y las
// reglas de acceso al bucket no se duplican.
//
// Los defaults son los de producción; sin variables el comportamiento es el de
// siempre. Las llaves NO tienen default: si faltan, el módulo que las use
// decide qué hacer (unifilar cae a disco local, ver StorageService).
module.exports = {
	baseUrl: process.env.STORAGE_URL || 'https://storageov.cooptech.com.ar',
	bucket: process.env.MINIO_BUCKET || 'reconecta',
	accessKey: process.env.MINIO_ACCESS || '',
	secretKey: process.env.MINIO_SECRET || '',
}
