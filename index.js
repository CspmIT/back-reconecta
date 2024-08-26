const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')

// Rutas
const publicRoutes = require('./routes/Public.routes')
// const privateRoutes = require('./routes/Private.routes')

// Configuracion para los cors
const corsConfig = require('./config/app.conf')
app.use(corsConfig)
app.use(cookieParser())
app.use('/api', publicRoutes)

// Configuracion para el body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.listen(4000, () => {
	console.log('Server is running on port 4000')
	console.log('http://localhost:4000')
})
