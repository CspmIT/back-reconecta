'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const date = new Date()
		await queryInterface.bulkInsert('EquipmentModels', [
			{
				name: 'NOJA',
				brand: 'RC01',
				description: 'Reconectador NOJA',
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
			{
				name: 'NOJA',
				brand: 'RC10',
				description: 'Reconectador NOJA',
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
			{
				name: 'COOPER',
				brand: 'Form 4',
				description: 'Reconectador COOPER',
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
			{
				name: 'COOPER',
				brand: 'Form 5',
				description: 'Reconectador COOPER',
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
			{
				name: 'COOPER',
				brand: 'Form 6',
				description: 'Reconectador COOPER',
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
			{
				name: 'ITRON',
				brand: 'SL7000',
				description: 'Medidor',
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
			{
				name: 'ITRON',
				brand: 'ACE6000',
				description: 'Medidor',
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
			{
				name: 'POWERMETER',
				brand: 'SMART',
				description: 'Para analizadores de red',
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
			{
				name: 'SACI',
				brand: 'LDA3E1',
				description: 'Para analizadores de red',
				status: 1,
				createdAt: date,
				updatedAt: date,
			},
		])
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('EquipmentModels', null, {})
	},
}
