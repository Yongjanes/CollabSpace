import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import jwt from 'jsonwebtoken'

const requireAuth = asyncHandler( async (req, _, next) => {
    // 1. Get token
    // 2. Verify token
    // 3. Fetch user
    // 4. Check isActive
    // 5. Attach req.user
    // 6. next()

    // --------------------------------------------------------------

    // 1. Get token

    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
        throw new ApiError(401, 'Authentication token is missing')
    }


    // 2. Verify token

    let decodedToken = null
    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    } catch (error) {
        throw new ApiError(401, 'Invalid authentication token')
    }

    // 3. Fetch user

    req.user = { id: decodedToken.id, email: decodedToken.email }

    // 4. Check isActive
    // Skipping for now

    // 5. Attach req.user
    // Done above

    // 6. next()
    next();
})