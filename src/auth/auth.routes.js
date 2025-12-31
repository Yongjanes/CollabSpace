import { Router } from 'express'

import { registerUser, loginUser, me, refreshAccessToken, logoutUser } from './auth.controller.js'

import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from './auth.middleware.js'

const authRouter = Router()

// Public Routes (No Auth)

authRouter.route('/register').post(asyncHandler(registerUser))
authRouter.route('/login').post(asyncHandler(loginUser))
authRouter.route('/refresh').post(asyncHandler(refreshAccessToken))
authRouter.route('/logout').post(asyncHandler(logoutUser))

// Protected Routes (Auth Required)
authRouter.use(requireAuth)

authRouter.route('/me').get(asyncHandler(me))

export { authRouter }