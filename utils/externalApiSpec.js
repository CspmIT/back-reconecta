/**
 * Especificacion OpenAPI 3 de la API externa (v1).
 *
 * Es la documentacion que muestra el modulo del front y la que puede importar
 * un integrador en Postman/Insomnia. Los limites y los permisos salen de las
 * mismas constantes que usa el codigo, para que la doc no se desincronice.
 */
const { SCOPES, MAX_EXPIRES_DAYS } = require('../services/ApiTokenService')
const { FAMILIES } = require('../services/LiveMeasureService')
const { WINDOWS, MAX_HISTORY_DAYS, MAX_POINTS, MAX_EVENTS } = require('../services/ExternalApiService')

const RATE_LIMIT = Number(process.env.EXTERNAL_API_RATE_LIMIT) || 120

const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema) => ({ 'application/json': { schema } })
const nullableNumber = { type: 'number', nullable: true }
const phases = { type: 'array', items: nullableNumber, minItems: 3, maxItems: 3, description: 'Fases A, B, C' }

const errors = {
	400: { description: 'Parametros invalidos', content: json(ref('Error')) },
	401: { description: 'Token ausente, invalido, vencido o revocado', content: json(ref('Error')) },
	403: { description: 'El token no tiene el permiso necesario', content: json(ref('Error')) },
	429: { description: `Mas de ${RATE_LIMIT} pedidos por minuto`, content: json(ref('Error')) },
}
const notFound = { 404: { description: 'Equipo no encontrado', content: json(ref('Error')) } }
const unsupported = {
	422: { description: 'El tipo de equipo no admite la consulta', content: json(ref('Error')) },
}

const serialParam = {
	name: 'serial',
	in: 'path',
	required: true,
	schema: { type: 'string' },
	description: 'Serial del equipo, tal como aparece en el listado (texto: puede tener ceros a la izquierda)',
}
// Fecha como la escribe una persona, en hora de Argentina (ver parseLocalDate)
const localDateParam = (name, description) => ({
	name,
	in: 'query',
	schema: { type: 'string', pattern: '^\\d{1,2}/\\d{1,2}/\\d{4} \\d{1,2}:\\d{2}$', example: '25/09/2026 14:30' },
	description: `${description}. Formato \`dd/mm/aaaa hh:mm\`, hora de Argentina.`,
})

const fieldsByFamily = Object.values(FAMILIES)
	.map((f) => `- **${f.kind}**: ${f.fields.map((x) => `\`${x}\``).join(', ')}`)
	.join('\n')

const buildSpec = (serverUrl = '/api/v1/external') => ({
	openapi: '3.0.3',
	info: {
		title: 'Reconecta API externa',
		version: '1.0.0',
		description: [
			'API de solo lectura para consultar los equipos de la cooperativa y sus mediciones.',
			'',
			'**Autenticacion**: cada pedido lleva el header `Authorization: Bearer <token>`. El token se genera desde Reconecta',
			'(Configuracion → API externa) y se muestra una sola vez. Cada token pertenece a una cooperativa y tiene permisos',
			`propios; puede vencer (hasta ${MAX_EXPIRES_DAYS} dias) o no, y se puede revocar en cualquier momento.`,
			'',
			`**Limite**: ${RATE_LIMIT} pedidos por minuto por token. Las respuestas informan \`X-RateLimit-Limit\`,`,
			'`X-RateLimit-Remaining` y `X-RateLimit-Reset`; al superarlo se responde 429 con `Retry-After`.',
			'',
			'**Unidades**: cada equipo informa las magnitudes en las unidades en las que las publica. El reconectador mide en',
			'la red de media tension; el medidor se informa convertido al primario con su relacion de transformacion; el',
			'analizador mide baja tension. Un valor `null` significa "sin dato", no cero.',
		].join('\n'),
	},
	servers: [{ url: serverUrl }],
	security: [{ bearerAuth: [] }],
	tags: [
		{ name: 'Token', description: 'Datos del token en uso' },
		{ name: 'Equipos', description: `Permiso \`equipments:read\`` },
		{ name: 'Metrologia', description: `Permiso \`metrology:read\`` },
		{ name: 'Eventos', description: `Permiso \`events:read\`` },
	],
	paths: {
		'/me': {
			get: {
				tags: ['Token'],
				summary: 'Datos del token',
				description: 'Sirve para probar la conexion: devuelve el nombre, la cooperativa y los permisos del token.',
				responses: { 200: { description: 'OK', content: json(ref('TokenInfo')) }, 401: errors[401], 429: errors[429] },
			},
		},
		'/equipments': {
			get: {
				tags: ['Equipos'],
				summary: 'Listado de equipos',
				parameters: [
					{
						name: 'type',
						in: 'query',
						schema: { type: 'string', enum: ['recloser', 'meter', 'analyzer'] },
						description: 'Filtra por tipo de equipo',
					},
				],
				responses: {
					200: { description: 'OK', content: json({ type: 'array', items: ref('Equipment') }) },
					...errors,
				},
			},
		},
		'/equipments/{serial}': {
			get: {
				tags: ['Equipos'],
				summary: 'Detalle de un equipo',
				parameters: [serialParam],
				responses: { 200: { description: 'OK', content: json(ref('Equipment')) }, ...errors, ...notFound },
			},
		},
		'/equipments/{serial}/instant': {
			get: {
				tags: ['Metrologia'],
				summary: 'Metrologia instantanea',
				description:
					'Ultimo valor publicado de tension, corriente y potencias. Es el mismo calculo que muestran el mapa y la tabla general de Reconecta.',
				parameters: [serialParam],
				responses: {
					200: { description: 'OK', content: json(ref('Instant')) },
					...errors,
					...notFound,
					...unsupported,
				},
			},
		},
		'/equipments/{serial}/history': {
			get: {
				tags: ['Metrologia'],
				summary: 'Historico de variables',
				description: [
					'Series de los campos que publica el equipo, promediados por ventana. Los nombres son los que publica cada',
					'familia:',
					'',
					fieldsByFamily,
					'',
					'En el reconectador, la tension depende de la marca: NOJA publica `V_L_ABC_n` de linea y `V_f_ABC_n` de fase;',
					'COOPER publica solo `V_L_ABC_n` y ahi manda la de fase. En `W_0`/`W_1`/`W_2` van la aparente, la activa y la',
					'reactiva totales.',
					'',
					'En el medidor, tension y corriente van convertidas al primario con la relacion de transformacion vigente.',
					'',
					'Cada punto es el promedio de su ventana y `t` es el FIN de la ventana.',
					'',
					'Las fechas de `from` y `to` se escriben `dd/mm/aaaa hh:mm` en hora de Argentina y van codificadas en la URL (`from=25/09/2026%2014:30`). La respuesta devuelve las fechas en ISO 8601 (UTC).',
					'',
					`Rango maximo: ${MAX_HISTORY_DAYS} dias. Tope de ${MAX_POINTS} puntos por variable (rango / ventana).`,
				].join('\n'),
				parameters: [
					serialParam,
					localDateParam('from', 'Inicio del rango (por defecto, 24 h antes de `to`)'),
					localDateParam('to', 'Fin del rango (por defecto, ahora)'),
					{
						name: 'window',
						in: 'query',
						schema: { type: 'string', enum: Object.keys(WINDOWS), default: '15m' },
						description: 'Ventana de agregacion',
					},
					{
						name: 'fields',
						in: 'query',
						schema: { type: 'string' },
						description: 'Campos separados por coma. Por defecto, todos los de la familia.',
					},
				],
				responses: {
					200: { description: 'OK', content: json(ref('History')) },
					...errors,
					...notFound,
					...unsupported,
				},
			},
		},
		'/equipments/{serial}/events': {
			get: {
				tags: ['Eventos'],
				summary: 'Eventos de un reconectador',
				description:
					'Eventos registrados por el equipo, del mas reciente al mas antiguo. Solo reconectadores. Las fechas de `from` y `to` se escriben `dd/mm/aaaa hh:mm` en hora de Argentina; sin rango, devuelve los mas recientes hasta `limit`.',
				parameters: [
					serialParam,
					localDateParam('from', 'Inicio del rango'),
					localDateParam('to', 'Fin del rango'),
					{
						name: 'limit',
						in: 'query',
						schema: { type: 'integer', minimum: 1, maximum: MAX_EVENTS, default: 200 },
					},
				],
				responses: {
					200: { description: 'OK', content: json({ type: 'array', items: ref('Event') }) },
					...errors,
					...notFound,
					...unsupported,
				},
			},
		},
		'/alarms': {
			get: {
				tags: ['Eventos'],
				summary: 'Alarmas de la cooperativa',
				description:
					'Eventos de prioridad alta de los reconectadores y equipos sin comunicacion, igual que la vista de alarmas de Reconecta.',
				parameters: [
					{
						name: 'active',
						in: 'query',
						schema: { type: 'string', enum: ['true', 'false'], default: 'true' },
						description: '`true` devuelve solo las no revisadas; `false`, todas',
					},
				],
				responses: {
					200: { description: 'OK', content: json({ type: 'array', items: ref('Alarm') }) },
					...errors,
				},
			},
		},
	},
	components: {
		securitySchemes: {
			bearerAuth: { type: 'http', scheme: 'bearer', description: 'Token de API con formato `rk.<cooperativa>.<secreto>`' },
		},
		schemas: {
			Error: { type: 'object', properties: { error: { type: 'string' } } },
			TokenInfo: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					cooperative: { type: 'string' },
					scopes: { type: 'array', items: { type: 'string', enum: Object.keys(SCOPES) } },
				},
			},
			Equipment: {
				type: 'object',
				properties: {
					serial: { type: 'string', description: 'Identificador del equipo en la API' },
					type: { type: 'string', enum: ['recloser', 'meter', 'analyzer', 'other'] },
					is_main: { type: 'boolean', description: 'Equipo principal del elemento cuando hay mas de uno' },
					observation: { type: 'string', nullable: true },
					model: {
						type: 'object',
						properties: { name: { type: 'string' }, brand: { type: 'string' } },
					},
					element: {
						type: 'object',
						description: 'Instalacion donde esta el equipo',
						properties: {
							name: { type: 'string' },
							description: { type: 'string', nullable: true },
							lat: nullableNumber,
							lon: nullableNumber,
						},
					},
				},
			},
			Instant: {
				type: 'object',
				properties: {
					serial: { type: 'string' },
					type: { type: 'string' },
					state: {
						type: 'string',
						enum: ['cerrado', 'abierto', 'activo', 'sincom'],
						description:
							'Reconectador: `cerrado`/`abierto`. Medidor y analizador: `activo` si publico en los ultimos 30 min. `sincom`: sin comunicacion.',
					},
					time: { type: 'string', format: 'date-time', nullable: true, description: 'Ultima publicacion' },
					voltage_line: { ...phases, description: 'Tension compuesta (de linea) por fase' },
					voltage_line_derived: {
						type: 'boolean',
						description: 'true si la compuesta se calculo desde la de fase (x raiz de 3)',
					},
					voltage_phase: { ...phases, description: 'Tension de fase' },
					current: phases,
					power: {
						type: 'object',
						properties: { s: nullableNumber, p: nullableNumber, q: nullableNumber },
						description: 'Aparente, activa y reactiva totales del equipo',
					},
					units: {
						type: 'object',
						properties: {
							v: { type: 'string' },
							i: { type: 'string' },
							s: { type: 'string' },
							p: { type: 'string' },
							q: { type: 'string' },
						},
					},
					transform_ratio: { type: 'string', nullable: true, description: 'Relacion aplicada (solo medidores)' },
				},
			},
			History: {
				type: 'object',
				properties: {
					serial: { type: 'string' },
					type: { type: 'string' },
					from: { type: 'string', format: 'date-time' },
					to: { type: 'string', format: 'date-time' },
					window: { type: 'string' },
					aggregate: { type: 'string', enum: ['mean'] },
					transform_ratio: { type: 'string', nullable: true },
					fields: {
						type: 'object',
						additionalProperties: {
							type: 'object',
							properties: {
								unit: { type: 'string', nullable: true },
								points: {
									type: 'array',
									items: {
										type: 'object',
										properties: { t: { type: 'string', format: 'date-time' }, v: { type: 'number' } },
									},
								},
							},
						},
					},
				},
			},
			Event: {
				type: 'object',
				properties: {
					date: { type: 'string', format: 'date-time' },
					code: { type: 'integer', description: 'Codigo del evento en el equipo' },
					name: { type: 'string' },
					priority: { type: 'integer' },
					info: { type: 'string', nullable: true },
				},
			},
			Alarm: {
				type: 'object',
				properties: {
					date: { type: 'string', format: 'date-time' },
					serial: { type: 'string', nullable: true },
					element: { type: 'string', nullable: true },
					device_type: { type: 'string' },
					code: { type: 'integer' },
					name: { type: 'string' },
					description: { type: 'string', nullable: true },
					priority: { type: 'integer' },
					active: { type: 'boolean' },
					info: { type: 'string', nullable: true },
				},
			},
		},
	},
})

module.exports = { buildSpec }
