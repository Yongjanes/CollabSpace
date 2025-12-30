import crypto from 'crypto'

import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { hashPassword } from '../utils/hash.js'
import { generateAccessToken } from '../utils/token.js'
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
                    accessToken
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


export { registerUser, loginUser, me }