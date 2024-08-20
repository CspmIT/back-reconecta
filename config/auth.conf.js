const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const User = require('../src/models/User.model.js')

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'Cspmdesarrollo03'
}

module.exports = new JwtStrategy(opts, (jwt_payload, done) => {
    User.findByPk(jwt_payload.sub)
        .then((user) => {
            if (user) {
                return done(null, user)
            }
            return done(null, false)
        })
        .catch((err) => console.error(err))
})
