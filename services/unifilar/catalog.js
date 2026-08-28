// Catálogo de tipos del unifilar.
//
// Es el vocabulario compartido: el backend lo usa para armar el modelo
// topológico (cuántos bornes tiene cada tipo, si deja pasar corriente, si es
// una fuente) y el frontend para dibujar el símbolo IEC correspondiente. El
// dibujo NO vive acá — acá está sólo lo que hace falta para razonar sobre la
// red.
//
// Campos:
//   nom      rótulo para la UI
//   gr       grupo en la paleta
//   term     bornes: 2 = intercalado en la línea · 1 = terminal de rama
//   maniobra se puede abrir y cerrar (y entonces `estado` decide si conduce)
//   pasa     deja pasar corriente siempre (los de maniobra no lo declaran)
//   fuente   inyecta tensión: de acá arrancan los recorridos de energización
//   pref     prefijo para autonumerar
//
// Los cuatro últimos tipos no están en la IEC 60617 clásica del mockup pero sí
// en los planos de la cooperativa (E.T. Morteros los tiene en cada campo), así
// que sin ellos no se puede tipificar una celda completa.
const CATALOG = {
	interruptor: { nom: 'Interruptor de potencia', gr: 'Maniobra y protección', term: 2, maniobra: true, pref: '52' },
	recloser: { nom: 'Reconectador', gr: 'Maniobra y protección', term: 2, maniobra: true, pref: 'R' },
	seccionador: { nom: 'Seccionador', gr: 'Maniobra y protección', term: 2, maniobra: true, pref: 'S' },
	seccionadorCarga: { nom: 'Seccionador bajo carga', gr: 'Maniobra y protección', term: 2, maniobra: true, pref: 'SC' },
	fusible: { nom: 'Fusible', gr: 'Maniobra y protección', term: 2, maniobra: true, pref: 'F' },
	trafo: { nom: 'Transformador de potencia', gr: 'Transformación', term: 2, pasa: true, pref: 'T' },
	trafoDist: { nom: 'Subestación de distribución', gr: 'Transformación', term: 1, pref: 'SET' },
	fuente: { nom: 'Alimentación de red', gr: 'Fuentes y cargas', term: 1, fuente: true, pref: 'FTE' },
	generador: { nom: 'Generación distribuida', gr: 'Fuentes y cargas', term: 1, fuente: true, pref: 'GD' },
	capacitor: { nom: 'Banco de capacitores', gr: 'Compensación', term: 1, pref: 'BC' },
	barra: { nom: 'Barra colectora', gr: 'Barras y conductores', term: 0, barra: true, pasa: true, pref: 'BARRA' },
	cond: { nom: 'Conductor', gr: 'Barras y conductores', term: 2, conductor: true, pasa: true, pref: 'C' },
	// Presentes en los planos de la cooperativa
	pararrayos: { nom: 'Descargador / pararrayos', gr: 'Protección', term: 1, pref: 'DPS' },
	ti: { nom: 'Transformador de corriente', gr: 'Medición', term: 2, pasa: true, pref: 'TI' },
	tv: { nom: 'Transformador de tensión', gr: 'Medición', term: 1, pref: 'TV' },
	relay: { nom: 'Relé de protección', gr: 'Protección', term: 0, pref: 'RELAY' },
	puestaTierra: { nom: 'Puesta a tierra', gr: 'Protección', term: 1, pref: 'PAT' },
}

const isManiobra = (tipo) => !!CATALOG[tipo]?.maniobra
// Un aparato de maniobra conduce según su estado; el resto, según su tipo.
const conduce = (el) => (CATALOG[el.tipo]?.maniobra ? el.estado === 'cerrado' : !!CATALOG[el.tipo]?.pasa)

module.exports = { CATALOG, isManiobra, conduce }
