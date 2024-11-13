require('dotenv').config()
const express = require('express')
const app = express()
const http = require('http')
const socketConfig = require('./config/socket')
const cookieParser = require('cookie-parser')

// Rutas
const publicRoutes = require('./routes/Public.routes')
const recloserRoutes = require('./routes/Recloser.routes')
const AuthRoutes = require('./routes/Auth.routes')
const MigrationRoutes = require('./routes/Migration.routes')
const UserRoutes = require('./routes/User.routes')
const NodeRoutes = require('./routes/Node.routes')
const AlarmRoutes = require('./routes/Alarm.routes')
const AlarmEvent = require('./routes/Event.routes')
const Meter = require('./routes/Meter.routes')

// Configuracion para los cors
const corsConfig = require('./config/app.conf')
const { verifyToken } = require('./middleware/Auth.middleware')
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
app.use('/api', NodeRoutes)
app.use('/api', AlarmRoutes)
app.use('/api', AlarmEvent)
app.use('/api', Meter)

const server = http.createServer(app)
app.use('/api', async (req, res, next) => {
	await socketConfig.init(server, req, res)
	next()
})
server.listen(4000, () => {
	console.log('Server is running on port 4000')
	console.log('http://localhost:4000')
})
