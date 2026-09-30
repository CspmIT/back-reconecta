/**
 * Traduccion de un path de la API a un modulo de negocio, para agrupar el
 * trafico en el dashboard de auditoria.
 *
 * Las rutas de Reconecta son planas (no hay prefijo por modulo), asi que la
 * agrupacion se hace por patron sobre el path. El orden importa: gana la
 * primera regla que matchea.
 */
const MODULE_RULES = [
	// Va primero: /v1/external/equipments matchea las reglas de equipos.
	[/^\/v1\/external|^\/apitokens/i, 'API externa'],
	[/^\/audit/i, 'Auditoría'],
	// Va antes que la regla de eventos: /autonomia/eventos matchea /event/.
	[/^\/autonomia/i, 'AutonomIA'],
	[/binnacle|bitacora/i, 'Bitácora'],
	[/analyzer|sunburst/i, 'Analizadores'],
	[/substation/i, 'Subestaciones'],
	[/personal/i, 'Personal'],
	[/meter|metrolog|eob|quality/i, 'Medidores'],
	[/alarm|checks/i, 'Alarmas'],
	[/event|confignotify/i, 'Eventos'],
	[/map|location/i, 'Mapa'],
	[/node/i, 'Nodos'],
	[/element|equipment/i, 'Equipos'],
	[/recloser|mqtt|control|curva|manauvers|corrientes|tension/i, 'Reconectadores'],
	[/graphic|chart/i, 'Gráficos'],
	[/login|cooptech|user|profile|permission|menu|pass|columnstable|configtable/i, 'Usuarios y accesos'],
	[/influx|interruptions/i, 'Influx'],
	[/migrate/i, 'Migraciones'],
]

/**
 * Normaliza un path para que sirva como clave de endpoint: saca el prefijo
 * /api, la query string y reemplaza los ids por ':id'. Sin esto cada
 * /Equipment/5 seria un endpoint distinto en los rankings.
 *
 * @param {string} url - `req.originalUrl` del request.
 * @returns {string} Path normalizado, truncado al largo de la columna.
 */
const normalizePath = (url) => {
	const path = (url || '').split('?')[0].replace(/\/+$/, '') || '/'
	return (
		path
			.replace(/^\/api/, '')
			.split('/')
			.map((seg) => (/^\d+$/.test(seg) ? ':id' : seg))
			.join('/')
			// La key del binario de AutonomIA es un nombre de objeto (uuid): sin
			// esto cada firmware seria un endpoint distinto en los rankings.
			.replace(/^\/autonomia\/bin\/.+$/i, '/autonomia/bin/:key')
			// La API externa identifica al equipo por serial, que no siempre es
			// numerico (1VYV91254078): sin esto cada equipo seria un endpoint.
			.replace(/^(\/v1\/external\/equipments\/)[^/]+/i, '$1:serial')
			.slice(0, 255)
	)
}

/**
 * Modulo de negocio al que pertenece un path.
 *
 * @param {string} path - Path ya normalizado.
 * @returns {string} Nombre del modulo, u 'Otros' si ninguna regla matchea.
 */
const moduleFromPath = (path) => {
	const found = MODULE_RULES.find(([pattern]) => pattern.test(path))
	return found ? found[1] : 'Otros'
}

module.exports = { normalizePath, moduleFromPath }
