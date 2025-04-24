const convertIsoToDate = async (isoString) => {
	const fecha = new Date(isoString)

	const año = fecha.getFullYear()
	const mes = String(fecha.getMonth() + 1).padStart(2, '0')
	const dia = String(fecha.getDate()).padStart(2, '0')
	const horas = String(fecha.getHours()).padStart(2, '0')
	const minutos = String(fecha.getMinutes()).padStart(2, '0')
	const segundos = String(fecha.getSeconds()).padStart(2, '0')

	return `${dia}/${mes}/${año} ${horas}:${minutos}`
}

module.exports = {
	convertIsoToDate,
}
