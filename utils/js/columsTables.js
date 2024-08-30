const columnsTables = {
	recloser: [
		{
			name: 'num_recloser',
			status: 1,
		},
		{
			name: 'name',
			status: 1,
		},
		{
			name: 'serial',
			status: 1,
		},
		{
			name: 'type_recloser',
			status: 1,
		},
		{
			name: 'status_recloser',
			status: 1,
		},
		{
			name: 'online',
			status: 1,
		},
		{
			name: 'status_alarm_recloser',
			status: 1,
		},
	],
	meter: [
		{
			name: 'num_serie',
			status: 1,
		},
		{
			name: 'device_name',
			status: 1,
		},
		{
			name: 'type_station',
			status: 1,
		},
		{
			name: 'version',
			status: 1,
		},
		{
			name: 'brand',
			status: 1,
		},
		{
			name: 'status',
			status: 1,
		},
	],
	sub_urban: [
		{
			name: 'name',
			status: 1,
		},
		{
			name: 'location',
			status: 1,
		},
		{
			name: 'status',
			status: 1,
		},
	],
	sub_rural: [
		{
			name: 'name_station',
			status: 1,
		},
		{
			name: 'user',
			status: 1,
		},
		{
			name: 'num_meter',
			status: 1,
		},
		{
			name: 'lat_point',
			status: 1,
		},
		{
			name: 'lng_point',
			status: 1,
		},
		{
			name: 'potencia_transformador',
			status: 1,
		},
		{
			name: 'status',
			status: 1,
		},
	],
	analizer: [
		{
			name: 'name',
			status: 1,
		},
		{
			name: 'brand',
			status: 1,
		},
		{
			name: 'version',
			status: 1,
		},
		{
			name: 'serial',
			status: 1,
		},
	],
}

module.exports = {
	columnsTables,
}
