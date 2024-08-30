require('dotenv').config()
const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')

// Rutas
const publicRoutes = require('./routes/Public.routes')
const recloserRoutes = require('./routes/Recloser.routes')
const AuthRoutes = require('./routes/Auth.routes')
const MigrationRoutes = require('./routes/Migration.routes')
const UserRoutes = require('./routes/User.routes')
// const privateRoutes = require('./routes/Private.routes')

// Configuracion para los cors
const corsConfig = require('./config/app.conf')
app.use(corsConfig)
app.use(cookieParser())

// Configuracion para el body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api', publicRoutes)
app.use('/api', recloserRoutes)
app.use('/api', AuthRoutes)
app.use('/api', MigrationRoutes)
app.use('/api', UserRoutes)

app.listen(4000, () => {
	console.log('Server is running on port 4000')
	console.log('http://localhost:4000')
})
