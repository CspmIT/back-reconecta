'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		const date = new Date()

		// IDs explícitos 1-5: Element.type referencia estos valores y hay lógica
		// cableada en el backend (type === 3 = subestación rural). No cambiar.
		await queryInterface.bulkInsert('ElementTypes', [
			{ id: 1, name: 'Reconexión', status: 1, createdAt: date, updatedAt: date },
			{ id: 2, name: 'Subestación urbana', status: 1, createdAt: date, updatedAt: date },
			{ id: 3, name: 'Subestación rural', status: 1, createdAt: date, updatedAt: date },
			{ id: 4, name: 'Estación transformadora', status: 1, createdAt: date, updatedAt: date },
			{ id: 5, name: 'Consumos puntuales', status: 1, createdAt: date, updatedAt: date },
		])

		const abrevsByType = {
			1: ['RE'],
			2: ['SETA'],
			3: ['BE', 'DH', 'IA', 'MA', 'MI', 'MR', 'SP', 'XJ'],
			4: ['ET'],
			5: ['CE'],
		}

		const abrevRows = []
		for (const [id_type, abrevs] of Object.entries(abrevsByType)) {
			for (const abrev of abrevs) {
				abrevRows.push({
					id_type: Number(id_type),
					abrev,
					createdAt: date,
					updatedAt: date,
				})
			}
		}

		await queryInterface.bulkInsert('ElementTypeAbrevs', abrevRows)
	},

	async down(queryInterface) {
		await queryInterface.bulkDelete('ElementTypeAbrevs', null, {})
		await queryInterface.bulkDelete('ElementTypes', null, {})
	},
}
