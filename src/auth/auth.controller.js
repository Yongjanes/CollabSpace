import crypto from 'crypto'
import jwt from 'jsonwebtoken'

import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { hashPassword, comparePassword } from '../utils/hash.js'
import { generateAccessToken, generateRefreshToken } from '../utils/token.js'
import { toMilliseconds } from '../utils/time.js'


import { User } from "../models/user.model.js"

const registerUser = async (req, res) => {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
        throw new ApiError(400, 'All fields are required')
    }

    const existingUser = await User.findOne({ email: email })

    if (existingUser) {
        throw new ApiError(409, 'User already exists')
    }

    const user = await User.create(
        {
            name: name,
            email: email,
            password: await hashPassword(password)
        }
    )

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                'User registered successfully',
                {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            )
        )
}

const loginUser = async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required')
    }

    const user = await User.findOne({ email: email })

    if (!user) {
        throw new ApiError(401, 'Invalid credentials')
    }

    if (!user.isActive) {
        throw new ApiError(403, 'User account is inactive')
    }

    const isValid = await comparePassword(password, user.password)

    if (!isValid) {
        throw new ApiError(401, 'Invalid credentials')
    }

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex')

    user.refreshTokens.push(
        {
            tokenHash: refreshTokenHash,
            expiresAt: new Date(
                Date.now() + toMilliseconds(process.env.REFRESH_TOKEN_EXPIRY)
            )
        }
    )

    await user.save()

    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: toMilliseconds(process.env.REFRESH_TOKEN_EXPIRY)
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Login successful',
                {
                    accessToken,
                    refreshToken
                }
            )
        )
}

const me = async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'User fetched successfully',
                req.user
            )
        )
}

const refreshAccessToken = async (req, res) => {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken

    if (!refreshToken) {
        throw new ApiError(401, 'Refresh token missing')
    }

    let decoded

    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    } catch (error) {
        res.clearCookie('refresh_token')
        throw new ApiError(401, 'Invalid refresh token')
    }

    if (decoded.type !== 'refresh') {
        res.clearCookie('refresh_token')
        throw new ApiError(401, 'Invalid token type')
    }

    const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex')

    const user = await User.findOne(
        {
            _id: decoded.sub,
            'refreshTokens.tokenHash': refreshTokenHash
        }
    )

    if (!user) {
        await User.updateOne(
            { _id: decoded.sub },
            { $set: { refreshTokens: [] } }
        )
        res.clearCookie('refresh_token')
        throw new ApiError(401, 'Refresh token reuse detected')
    }

    if (!user.isActive) {
        throw new ApiError(403, 'User account is inactive')
    }

    const storedToken = user.refreshTokens.find(
        (token) => token.tokenHash === refreshTokenHash
    )

    if (!storedToken || storedToken.expiresAt < new Date()) {
        res.clearCookie('refresh_token')
        throw new ApiError(401, 'Refresh token expired')
    }

    user.refreshTokens = user.refreshTokens.filter(
        (token) => token.tokenHash !== refreshTokenHash
    )

    const newAccessToken = generateAccessToken(user._id)
    const newRefreshToken = generateRefreshToken(user._id)

    const newRefreshTokenHash = crypto
        .createHash('sha256')
        .update(newRefreshToken)
        .digest('hex')

    user.refreshTokens.push(
        {
            tokenHash: newRefreshTokenHash,
            expiresAt: new Date(
                Date.now() + toMilliseconds(process.env.REFRESH_TOKEN_EXPIRY)
            )
        }
    )

    await user.save()

    res.cookie(
        'refresh_token',
        newRefreshToken,
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: toMilliseconds(process.env.REFRESH_TOKEN_EXPIRY)
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Token refreshed successfully',
                {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                }
            )
        )
}

const logoutUser = async (req, res) => {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken

    if (!refreshToken) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    'Logged out successfully'
                )
            )
    }

    const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex')

    await User.updateOne(
        {
            'refreshTokens.tokenHash': refreshTokenHash
        },
        {
            $pull: { refreshTokens: { tokenHash: refreshTokenHash } }
        }
    )

    res.clearCookie(
        'refresh_token',
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                'Logged out successfully'
            )
        )

}


export { registerUser, loginUser, me, refreshAccessToken, logoutUser }