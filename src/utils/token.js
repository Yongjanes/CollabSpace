import jwt from 'jsonwebtoken'

const generateAccessToken = (userId) => {
    return jwt.sign(
        { sub: userId, type: 'access' },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )
}

const generateRefreshToken = (userId) => {
    return jwt.sign(
        { sub: userId, type: 'refresh' },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )
}

export { generateAccessToken, generateRefreshToken }