/**
 * Union de los tableros de varias cooperativas en uno solo.
 *
 * Son funciones puras: reciben lo que devolvio AuditService por cada base y
 * arman la vista global. MySQL devuelve los agregados como strings, asi que
 * todo entra por Number() antes de sumarse.
 */

const num = (value) => Number(value || 0)

/**
 * Agrupa filas de varias cooperativas por una clave y suma los campos pedidos.
 *
 * @param {Array} parts - [{ schema, rows }] de cada cooperativa.
 * @param {Function} keyFn - Clave de agrupamiento de una fila.
 * @param {string[]} sumFields - Campos a sumar.
 * @param {string} [weightField] - Campo cuyo promedio se pondera por `weightOn`.
 * @param {string} [weightOn] - Campo que hace de peso del promedio.
 * @param {string[]} [maxFields] - Campos que se quedan con el valor mas alto
 *   (fechas, por ejemplo) en vez de sumarse.
 * @returns {Array} Filas combinadas, con `schemas` listando de donde salio cada una.
 */
const groupSum = (parts, keyFn, sumFields, weightField, weightOn, maxFields = []) => {
	const map = new Map()
	for (const { schema, rows } of parts) {
		for (const row of rows || []) {
			const key = keyFn(row)
			if (!map.has(key)) {
				map.set(key, { ...row, schemas: [], _weighted: 0, _weight: 0 })
				for (const field of sumFields) map.get(key)[field] = 0
			}
			const target = map.get(key)
			for (const field of sumFields) target[field] += num(row[field])
			for (const field of maxFields) {
				if (row[field] && new Date(row[field]) > new Date(target[field])) target[field] = row[field]
			}
			if (weightField) {
				const weight = num(row[weightOn])
				target._weighted += num(row[weightField]) * weight
				target._weight += weight
			}
			if (!target.schemas.includes(schema)) target.schemas.push(schema)
		}
	}
	return [...map.values()].map((row) => {
		if (weightField) {
			row[weightField] = row._weight ? row._weighted / row._weight : 0
		}
		delete row._weighted
		delete row._weight
		return row
	})
}

const byField = (field) => (row) => String(row[field])
const desc = (field) => (a, b) => num(b[field]) - num(a[field])

/**
 * Suma los KPIs de todas las cooperativas. El tiempo de respuesta promedio se
 * pondera por cantidad de pedidos: promediar promedios le daria el mismo peso a
 * una cooperativa con 50 pedidos que a una con 50.000.
 *
 * @param {Array} parts - [{ schema, dashboard }]
 * @returns {Object} KPIs combinados.
 */
const mergeKpis = (parts) => {
	const total = { sessions_today: 0, sessions_month: 0, requests_today: 0, requests_month: 0, errors: 0 }
	let periodRequests = 0
	let periodMs = 0

	for (const { dashboard } of parts) {
		for (const key of Object.keys(total)) total[key] += num(dashboard.kpis[key])
		periodRequests += num(dashboard.kpis.period_requests)
		periodMs += num(dashboard.kpis.period_ms)
	}

	return {
		...total,
		avg_ms: periodRequests ? Math.round(periodMs / periodRequests) : null,
		period_requests: periodRequests,
		period_ms: periodMs,
	}
}

/**
 * Une las series temporales, los rankings y los errores de todas las
 * cooperativas, y agrega los cortes por organizacion que solo tienen sentido en
 * la vista global.
 *
 * @param {Array} parts - [{ schema, dashboard }] de cada cooperativa.
 * @returns {Object} Tablero combinado, con la misma forma que el de una sola.
 */
const mergeDashboards = (parts) => {
	const traffic = (field) => parts.map(({ schema, dashboard }) => ({ schema, rows: dashboard.traffic[field] }))
	const rankings = (field) => parts.map(({ schema, dashboard }) => ({ schema, rows: dashboard.rankings[field] }))
	const errors = (field) => parts.map(({ schema, dashboard }) => ({ schema, rows: dashboard.errors[field] }))

	const modules = groupSum(rankings('modules'), byField('module'), ['total', 'total_ms', 'errors']).sort(
		desc('total')
	)

	return {
		kpis: mergeKpis(parts),
		traffic: {
			by_day: groupSum(traffic('by_day'), byField('day'), ['total', 'errors'], 'avg_ms', 'total').sort((a, b) =>
				String(a.day).localeCompare(String(b.day))
			),
			by_hour: groupSum(traffic('by_hour'), byField('hour'), ['total'], 'avg_ms', 'total').sort(
				(a, b) => num(a.hour) - num(b.hour)
			),
			heatmap: groupSum(traffic('heatmap'), (row) => `${row.weekday}|${row.hour}`, ['total']),
			logins_by_day: groupSum(traffic('logins_by_day'), byField('day'), ['total']),
			mqtt_by_day: groupSum(traffic('mqtt_by_day'), byField('day'), ['total']),
		},
		rankings: {
			modules,
			endpoints: groupSum(rankings('endpoints'), byField('path'), ['total']).sort(desc('total')).slice(0, 10),
			// El minimo de llamadas se vuelve a aplicar sobre el total combinado:
			// un endpoint con 5 llamadas en cada una de 6 cooperativas si califica.
			slowest: groupSum(rankings('slowest'), byField('path'), ['total'], 'avg_ms', 'total')
				.filter((row) => num(row.total) >= 20)
				.sort(desc('avg_ms'))
				.slice(0, 10),
			// Los ids de usuario son de cada base, asi que la identidad comun es
			// el email; una misma persona en dos cooperativas suma sus pedidos.
			users: groupSum(
				parts.map(({ schema, dashboard }) => ({
					schema,
					rows: (dashboard.rankings.users || []).map((row) => ({ ...row, _key: row.user?.email || row.id_user })),
				})),
				byField('_key'),
				['total']
			)
				.sort(desc('total'))
				.slice(0, 10),
			latency: groupSum(rankings('latency'), byField('bucket'), ['total']),
			status: groupSum(rankings('status'), byField('bucket'), ['total']),
		},
		errors: {
			// `users` se suma porque son bases distintas: la misma persona en dos
			// cooperativas son dos cuentas. `last_seen` se queda con la mas
			// reciente de todas.
			grouped: groupSum(
				errors('grouped'),
				(row) => `${row.status}|${row.method}|${row.path}|${row.module}|${row.error_message}`,
				['total', 'users'],
				undefined,
				undefined,
				['last_seen']
			)
				.sort(desc('total'))
				.slice(0, 20),
			latest: parts
				.flatMap(({ schema, dashboard }) =>
					(dashboard.errors.latest || []).map((row) => ({ ...(row.toJSON ? row.toJSON() : row), schema }))
				)
				.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
				.slice(0, 20),
			by_module: groupSum(errors('by_module'), byField('module'), ['total']).sort(desc('total')),
		},
		by_organization: {
			requests: parts
				.map(({ schema, dashboard }) => ({ schema, total: num(dashboard.kpis.period_requests) }))
				.sort(desc('total')),
			sessions: parts
				.map(({ schema, dashboard }) => ({
					schema,
					total: (dashboard.traffic.logins_by_day || []).reduce((sum, row) => sum + num(row.total), 0),
				}))
				.sort(desc('total')),
			// Matriz cooperativa x modulo, para ver que usa cada una.
			adoption: parts.flatMap(({ schema, dashboard }) =>
				(dashboard.rankings.modules || []).map((row) => ({
					schema,
					module: row.module,
					total: num(row.total),
				}))
			),
		},
	}
}

module.exports = { mergeDashboards, mergeKpis }
