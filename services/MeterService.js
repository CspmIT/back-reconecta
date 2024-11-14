const { db } = require('../models')
const { ConsultaInflux } = require('./InfluxServices')

/**
 * Valida si un número de nodo está disponible para su uso.
 *
 * @param {string} number - El número del nodo a validar.
 * @param {number} idNode - El ID del nodo actual para evitar conflictos de actualización.
 * @returns {Promise<string|boolean>} Devuelve un mensaje si el número no está disponible o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getListMeter = async (serial, id_version, id) => {
	try {
		const MeterElectricity = await db.MeterElectricity.findAll({
			where: {
				status: 1,
			},
			include: [
				{
					association: 'version',
					attributes: ['id', 'name'],
					include: {
						association: 'brand',
						attributes: ['id', 'name'],
					},
				},
				{
					association: 'history',
					required: false,
					where: {
						type_device: 2,
					},
				},
			],
		})
		return MeterElectricity
	} catch (error) {
		throw error
	}
}

/**
 * Valida si un número de nodo está disponible para su uso.
 *
 * @param {string} number - El número del nodo a validar.
 * @param {number} idNode - El ID del nodo actual para evitar conflictos de actualización.
 * @returns {Promise<string|boolean>} Devuelve un mensaje si el número no está disponible o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getStatusMeter = async (data, influxName) => {
	try {
		const query = `|> range(start: -30m, stop: now())
		|> filter(fn: (r) => r["topic"] == "coop/energia/Medidor/${data.brand}/${data.version}/${data.serial}/status/VI")
        |> aggregateWindow(every: 10ms, fn: last, createEmpty: false)
		|> last()`

		let dataInflux = await ConsultaInflux(query, influxName)
		if (!dataInflux || dataInflux.length === 0) return 2
		const dataReturn = new Map()

		dataInflux.forEach((element) => {
			if (!dataReturn.has(element._field)) {
				dataReturn.set(element._field, [])
			}
			dataReturn.get(element._field).push({
				field: element._field,
				value: element._value,
				time: element._time,
			})
		})

		const v_0Value = dataReturn.get('V_0')?.[0]?.value

		if (v_0Value === undefined) {
			return 2
		}
		if (v_0Value) {
			return 1
		} else {
			return 2 // Abierto
		}
	} catch (error) {
		throw error
	}
}

/**
 * Valida si un número de nodo está disponible para su uso.
 *
 * @param {string} number - El número del nodo a validar.
 * @param {number} idNode - El ID del nodo actual para evitar conflictos de actualización.
 * @returns {Promise<string|boolean>} Devuelve un mensaje si el número no está disponible o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const validateMeter = async (serial, id_version, id) => {
	try {
		const MeterElectricity = await db.MeterElectricity.findOne({
			where: {
				serial: serial,
				id_version: id_version,
			},
		})
		if (MeterElectricity === null) {
			return false
		} else {
			if (MeterElectricity.id != id) {
				return 'El numero de serie no esta disponible'
			} else {
				return false
			}
		}
	} catch (error) {
		throw error
	}
}
/**
 * Valida si un número de nodo está disponible para su uso.
 *
 * @param {string} number - El número del nodo a validar.
 * @param {number} idNode - El ID del nodo actual para evitar conflictos de actualización.
 * @returns {Promise<string|boolean>} Devuelve un mensaje si el número no está disponible o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const MeterAdd = async (data, transaction) => {
	try {
		const [MeterElectricity, created] = await db.MeterElectricity.findOrCreate({
			where: [{ serial: data.serial, id_version: data.id_version }],
			defaults: { ...data },
			transaction,
		})
		if (!created) {
			await MeterElectricity.update(data, { transaction })
		}
		return MeterElectricity
	} catch (error) {
		throw error
	}
}

/**
 * Valida si un número de nodo está disponible para su uso.
 *
 * @param {string} number - El número del nodo a validar.
 * @param {number} idNode - El ID del nodo actual para evitar conflictos de actualización.
 * @returns {Promise<string|boolean>} Devuelve un mensaje si el número no está disponible o `false` si está disponible.
 * @throws {Error} Lanza un error si ocurre algún problema durante la validación.
 * @author  [José Romani] <jose.romani@hotmail.com>
 */
const getMetersEnabled = async (data, transaction) => {
	try {
		const meters = await getListMeter()
		const result = meters.filter((item) => {
			if (item.history.every((rel) => rel.status == 0) || item.history.length == 0) {
				return item
			}
		})
		return result
	} catch (error) {
		throw error
	}
}

module.exports = {
	getListMeter,
	validateMeter,
	MeterAdd,
	getStatusMeter,
	getMetersEnabled,
}
