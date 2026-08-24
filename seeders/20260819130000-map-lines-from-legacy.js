'use strict'

/**
 * Importa los tramos que estaban hardcodeados en el front
 * (src/modules/map/utils/js/polilines.js) a MapLines/MapLineVertices.
 *
 * Cada vertice se intenta anclar al elemento mas cercano dentro de TOLERANCIA_M.
 * Ojo: estos trazos se dibujaron a mano libre y casi ningun vertice cae sobre un
 * elemento (medido: 1 de 34 a menos de 150m, el resto a mas de 1km). Se importan
 * para no perder la geometria; el anclaje real se hace al redibujar con snapping.
 * Los que no caen sobre ningun elemento quedan como vertices libres con su
 * lat/lon. Los nombres son genericos a proposito: los reales los pone el
 * operador desde el mapa.
 *
 * @author fgonzalez <fgonzalez@coopmorteros.coop>
 */

const TOLERANCIA_M = 150

const TRAMOS = [
	{
		name: 'Tramo 1',
		points: [
			[-30.757728882973016, -61.98636531829835],
			[-30.6351499401114, -61.95800707375616],
			[-30.654606977794703, -61.83744907379151],
			[-30.714507971198397, -61.85023784637451],
			[-30.694929342828477, -61.97182651589444],
		],
	},
	{
		name: 'Tramo 2',
		points: [
			[-30.72250351826619, -61.97336196899415],
			[-30.736235940673403, -61.8871021270752],
			[-30.817383354360455, -61.90446138381959],
			[-30.802897349464384, -61.99593544006348],
			[-30.75768500819567, -61.98632240295411],
			[-30.77229835734234, -61.89491271972657],
		],
	},
	{
		name: 'Tramo 3',
		points: [
			[-30.717160036723538, -62.00580596923829],
			[-30.72250351826619, -61.97336196899415],
		],
	},
	{
		name: 'Tramo 4',
		points: [
			[-30.71502639094172, -62.01868057250977],
			[-30.69863333880776, -62.12113022804261],
			[-30.666537760733526, -62.114274501800544],
			[-30.663080545885272, -62.13510990142823],
			[-30.601064532295812, -62.12131261825562],
			[-30.616617446795324, -62.03049772277979],
			[-30.67201297120552, -62.043108763868716],
			[-30.67315269122997, -62.035915890956716],
			[-30.786956824103566, -62.0599708010354],
			[-30.77884514633407, -62.11146204933373],
			[-30.78674196707412, -62.113135418320944],
			[-30.782755139696434, -62.13939207428691],
			[-30.736457454361073, -62.12951044566294],
			[-30.74910092035703, -62.05204974700762],
		],
	},
	{
		name: 'Tramo 5',
		points: [
			[-30.601068773090944, -62.12131798267365],
			[-30.595514458283862, -62.15504716464546],
			[-30.54332439423312, -62.14075516591625],
			[-30.553101513163192, -62.086102682350635],
			[-30.572609074668094, -62.090496483470076],
			[-30.580408666458535, -62.047701402715525],
			[-30.61224722471892, -62.05581240385983],
		],
	},
]

const distanciaM = (lat1, lon1, lat2, lon2) => {
	const R = 6371000
	const rad = (g) => (g * Math.PI) / 180
	const dLat = rad(lat2 - lat1)
	const dLon = rad(lon2 - lon1)
	const a =
		Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
	return 2 * R * Math.asin(Math.sqrt(a))
}

module.exports = {
	async up(queryInterface) {
		const [existentes] = await queryInterface.sequelize.query('SELECT COUNT(*) AS n FROM MapLines')
		if (Number(existentes[0].n) > 0) {
			console.log('MapLines ya tiene tramos, se omite la importacion')
			return
		}

		const [elements] = await queryInterface.sequelize.query(
			'SELECT id, lat, lon FROM Elements WHERE lat IS NOT NULL AND lon IS NOT NULL'
		)
		const puntos = elements.map((e) => ({ id: e.id, lat: parseFloat(e.lat), lon: parseFloat(e.lon) }))

		const date = new Date()
		let anclados = 0
		let libres = 0

		for (const tramo of TRAMOS) {
			await queryInterface.bulkInsert('MapLines', [
				{ name: tramo.name, status: 1, createdAt: date, updatedAt: date },
			])
			const [filas] = await queryInterface.sequelize.query(
				'SELECT id FROM MapLines WHERE name = ? ORDER BY id DESC LIMIT 1',
				{ replacements: [tramo.name] }
			)
			const idLine = filas[0].id

			const vertices = tramo.points.map(([lat, lon], seq) => {
				let mejor = null
				for (const p of puntos) {
					const d = distanciaM(lat, lon, p.lat, p.lon)
					if (d <= TOLERANCIA_M && (!mejor || d < mejor.d)) mejor = { d, id: p.id }
				}
				if (mejor) {
					anclados++
					return { id_line: idLine, seq, id_element: mejor.id, lat: null, lon: null, createdAt: date, updatedAt: date }
				}
				libres++
				return { id_line: idLine, seq, id_element: null, lat, lon, createdAt: date, updatedAt: date }
			})

			await queryInterface.bulkInsert('MapLineVertices', vertices)
		}

		console.log(`Tramos importados: ${TRAMOS.length} | vertices anclados: ${anclados} | libres: ${libres}`)
	},

	async down(queryInterface) {
		const nombres = TRAMOS.map((t) => t.name)
		const [lineas] = await queryInterface.sequelize.query(
			`SELECT id FROM MapLines WHERE name IN (${nombres.map(() => '?').join(',')})`,
			{ replacements: nombres }
		)
		const ids = lineas.map((l) => l.id)
		if (!ids.length) return
		await queryInterface.sequelize.query(
			`DELETE FROM MapLineVertices WHERE id_line IN (${ids.map(() => '?').join(',')})`,
			{ replacements: ids }
		)
		await queryInterface.sequelize.query(`DELETE FROM MapLines WHERE id IN (${ids.map(() => '?').join(',')})`, {
			replacements: ids,
		})
	},
}
