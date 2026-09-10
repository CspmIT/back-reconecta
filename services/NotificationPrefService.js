// Preferencias de notificacion por usuario: interruptor general, ventana de
// silencio en la zona horaria del usuario y silenciado por tipo de alarma, tipo
// de dispositivo, evento puntual, equipo puntual o prioridad minima.
// El filtro corre al momento de enviar, no al generar la alarma: la alarma
// siempre se guarda en Logs_Alarm y se manda a Discord, lo que se silencia es el
// push de cada usuario.

const ALARM_TYPES = ['Evento', 'Deadman']
const DEVICE_TYPES = ['Reconectador', 'Medidor', 'Analizador']
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const DEFAULT_TZ = 'America/Argentina/Cordoba'

// Sin fila en NotificationPrefs el usuario recibe todo: el modulo es opt-out.
const DEFAULTS = {
	enabled: true,
	timezone: DEFAULT_TZ,
	quiet_enabled: false,
	quiet_start: null,
	quiet_end: null,
	quiet_days: null,
	quiet_allow_critical: true,
	muted_alarm_types: [],
	muted_device_types: [],
	muted_events: [],
	muted_devices: [],
	min_priority: null,
}

const EDITABLE = Object.keys(DEFAULTS)

// Acepta tanto una instancia de Sequelize como un objeto plano.
const plain = (pref) => (pref && typeof pref.get === 'function' ? pref.get({ plain: true }) : pref || {})

const list = (value) => (Array.isArray(value) ? value : [])

const toBool = (value, field) => {
	if (typeof value === 'boolean') return value
	if (value === 1 || value === 0 || value === '1' || value === '0') return Boolean(Number(value))
	throw new Error(`${field} debe ser true o false`)
}

const toTime = (value, field) => {
	if (value === null || value === '') return null
	if (typeof value !== 'string' || !TIME_RE.test(value)) throw new Error(`${field} debe tener formato HH:MM`)
	return value.length === 5 ? `${value}:00` : value
}

const toDays = (value) => {
	if (value === null || value === '') return null
	if (!Array.isArray(value)) throw new Error('quiet_days debe ser un arreglo de dias (0=domingo .. 6=sabado)')
	const days = value.map(Number)
	if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('quiet_days admite enteros de 0 a 6')
	return [...new Set(days)].sort((a, b) => a - b)
}

const toEnumList = (value, allowed, field) => {
	if (value === null) return []
	if (!Array.isArray(value)) throw new Error(`${field} debe ser un arreglo`)
	const invalid = value.filter((item) => !allowed.includes(item))
	if (invalid.length) throw new Error(`${field} solo admite: ${allowed.join(', ')}`)
	return [...new Set(value)]
}

const toIdList = (value, field) => {
	if (value === null) return []
	if (!Array.isArray(value)) throw new Error(`${field} debe ser un arreglo de ids`)
	const ids = value.map(Number)
	if (ids.some((id) => !Number.isInteger(id) || id <= 0)) throw new Error(`${field} solo admite ids numericos`)
	return [...new Set(ids)]
}

const toPriority = (value) => {
	if (value === null || value === '') return null
	const priority = Number(value)
	if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
		throw new Error('min_priority debe ser un entero de 1 a 5 (1 es la mas alta) o null')
	}
	return priority
}

const toTimezone = (value) => {
	if (!value) return DEFAULT_TZ
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: String(value) })
	} catch {
		throw new Error(`Zona horaria invalida: ${value}`)
	}
	return String(value)
}

const SANITIZERS = {
	enabled: (v) => toBool(v, 'enabled'),
	timezone: toTimezone,
	quiet_enabled: (v) => toBool(v, 'quiet_enabled'),
	quiet_start: (v) => toTime(v, 'quiet_start'),
	quiet_end: (v) => toTime(v, 'quiet_end'),
	quiet_days: toDays,
	quiet_allow_critical: (v) => toBool(v, 'quiet_allow_critical'),
	muted_alarm_types: (v) => toEnumList(v, ALARM_TYPES, 'muted_alarm_types'),
	muted_device_types: (v) => toEnumList(v, DEVICE_TYPES, 'muted_device_types'),
	muted_events: (v) => toIdList(v, 'muted_events'),
	muted_devices: (v) => toIdList(v, 'muted_devices'),
	min_priority: toPriority,
}

// Solo toma los campos presentes en el body: el PUT es un merge, no un reemplazo.
const sanitize = (body = {}) => {
	const changes = {}
	for (const field of EDITABLE) {
		if (body[field] === undefined) continue
		changes[field] = SANITIZERS[field](body[field])
	}
	return changes
}

const minutesOf = (time) => {
	const [hour, minute] = String(time).split(':')
	return Number(hour) * 60 + Number(minute)
}

// Hora y dia de la semana en la zona del usuario, sin dependencias de fechas.
const localNow = (timezone, date) => {
	let parts
	try {
		parts = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			hourCycle: 'h23',
			weekday: 'short',
			hour: '2-digit',
			minute: '2-digit',
		}).formatToParts(date)
	} catch {
		return localNow(DEFAULT_TZ, date)
	}
	const value = (type) => parts.find((part) => part.type === type)?.value
	return {
		minutes: Number(value('hour')) * 60 + Number(value('minute')),
		weekday: WEEKDAYS[value('weekday')],
	}
}

/**
 * True si el momento dado cae dentro de la ventana de silencio del usuario.
 * Si el fin es menor que el inicio la ventana cruza medianoche (22:00 -> 07:00);
 * en ese caso el dia se evalua en el instante de la alarma, no en el de inicio.
 */
const inQuietHours = (cfg, now = new Date()) => {
	if (!cfg.quiet_enabled || !cfg.quiet_start || !cfg.quiet_end) return false

	const start = minutesOf(cfg.quiet_start)
	const end = minutesOf(cfg.quiet_end)
	// Ventana degenerada: no silencia nada, asi un error de carga no deja al
	// usuario sin alarmas todo el dia.
	if (start === end) return false

	const { minutes, weekday } = localNow(cfg.timezone || DEFAULT_TZ, now)

	const days = list(cfg.quiet_days)
	if (days.length && !days.includes(weekday)) return false

	return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end
}

/**
 * Decide si una alarma se le notifica a un usuario.
 *
 * @param {Object|null} pref - Fila de NotificationPrefs del usuario (o null).
 * @param {Object} alarm - { type_alarm, type, id_device, id_event, priority }.
 * @returns {{ notify: boolean, reason: string|null }}
 */
const shouldNotify = (pref, alarm, now = new Date()) => {
	const cfg = { ...DEFAULTS, ...plain(pref) }
	const no = (reason) => ({ notify: false, reason })

	if (!cfg.enabled) return no('notificaciones desactivadas')
	if (list(cfg.muted_alarm_types).includes(alarm.type_alarm)) return no(`tipo de alarma ${alarm.type_alarm} silenciado`)
	if (list(cfg.muted_device_types).includes(alarm.type)) return no(`tipo de equipo ${alarm.type} silenciado`)
	if (alarm.id_event && list(cfg.muted_events).includes(Number(alarm.id_event))) return no('evento silenciado')
	if (alarm.id_device && list(cfg.muted_devices).includes(Number(alarm.id_device))) return no('equipo silenciado')

	const priority = alarm.priority == null ? null : Number(alarm.priority)
	if (cfg.min_priority != null && priority != null && priority > Number(cfg.min_priority)) {
		return no(`prioridad ${priority} por debajo del minimo configurado`)
	}

	if (inQuietHours(cfg, now)) {
		// Las criticas pueden atravesar el silencio si el usuario lo permite.
		const critical = priority === 1
		if (!(critical && cfg.quiet_allow_critical)) return no('horario silenciado')
	}

	return { notify: true, reason: null }
}

const getPref = async (db, idUser) => {
	const pref = await db.NotificationPref.findOne({ where: { id_user: idUser } })
	return { ...DEFAULTS, ...plain(pref) }
}

const savePref = async (db, idUser, body) => {
	const changes = sanitize(body)
	const current = await getPref(db, idUser)
	const merged = { ...current, ...changes }

	if (merged.quiet_enabled && (!merged.quiet_start || !merged.quiet_end)) {
		throw new Error('Para activar el silencio hay que definir quiet_start y quiet_end')
	}

	const data = {}
	for (const field of EDITABLE) data[field] = merged[field]

	const [pref, created] = await db.NotificationPref.findOrCreate({
		where: { id_user: idUser },
		defaults: { id_user: idUser, ...data },
	})
	if (!created) await pref.update(data)

	return { ...DEFAULTS, ...plain(pref) }
}

/**
 * Suscripciones que deben recibir una alarma: todos los dispositivos de los
 * usuarios activos cuyas preferencias no la silencien.
 */
const recipientsFor = async (db, alarm, now = new Date()) => {
	const subscriptions = await db.PushSubscription.findAll({
		include: [
			{
				association: 'user',
				required: true,
				attributes: ['id', 'status'],
				where: { status: 1 },
				include: [{ association: 'notificationPref', required: false }],
			},
		],
	})

	return subscriptions.filter((sub) => shouldNotify(sub.user?.notificationPref, alarm, now).notify)
}

module.exports = {
	ALARM_TYPES,
	DEVICE_TYPES,
	DEFAULTS,
	getPref,
	savePref,
	shouldNotify,
	inQuietHours,
	recipientsFor,
}
