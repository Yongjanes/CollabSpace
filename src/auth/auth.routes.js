import { Router } from 'express'

import { registerUser, loginUser, me } from './auth.controller.js'

import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from './auth.middleware.js'

const authRouter = Router()

// Public Routes (No Auth)

authRouter.route('/register').post(asyncHandler(registerUser))
authRouter.route('/login').post(asyncHandler(loginUser))

// Protected Routes (Auth Required)
authRouter.use(requireAuth)

authRouter.route('/me').get(asyncHandler(me))

export { authRouter }