import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

const requireAuth = asyncHandler( async (req, _, next) => {
    // 1. Get token
    // 2. Verify token
    // 3. Fetch user
    // 4. Check isActive
    // 5. next()

    // --------------------------------------------------------------

    // 1. Get token
    const access_token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1]

    if (!access_token) {
        throw new ApiError(401, 'Authentication token is missing')
    }


    // 2. Verify token
    let decodedToken = null
    try {
        decodedToken = jwt.verify(access_token, process.env.ACCESS_TOKEN_SECRET)
    } catch (error) {
        throw new ApiError(401, 'Invalid authentication token')
    }

    // 3. Fetch user
    req.user = await User.findById(decodedToken.id).select('-password')

    if (!req.user) {
        throw new ApiError(401, 'User not found')
    }

    // 4. Check isActive
    if (!req.user.isActive) {
        throw new ApiError(403, 'User account is inactive')
    }

    // 5. next()
    next();
    
})